from pathlib import Path
from collections import defaultdict
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit, parse_qs
from html import escape
import argparse
import json
import os
import re
import tempfile

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
DOCS = ROOT / "docs"
STATUS = ["Chưa kiểm tra", "Hoạt động tốt", "Thiếu hiệu ứng", "Đang lỗi"]


def read(name):
    return json.loads((DATA / name).read_text(encoding="utf-8-sig"))


def write(path, value, compact=False):
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as f:
        json.dump(value, f, ensure_ascii=False, indent=None if compact else 2,
                  separators=(",", ":") if compact else None)
    os.replace(f.name, path)


def build(settings=None):
    settings = read("settings.json") if settings is None else settings
    link = settings["download"]
    if link and (urlsplit(link).scheme not in ("http", "https") or not urlsplit(link).hostname):
        raise ValueError("Link tải cần bắt đầu bằng https:// hoặc http:// và có tên miền.")
    names = read("names.json")
    groups = defaultdict(list)
    ids = read("ids.json")
    for mappings in ids.values():
        for source, target in mappings.items():
            groups[target].append(source)
    rows = []
    for target, sources in groups.items():
        info = settings["skins"].get(target, {})
        status = info.get("status", STATUS[0])
        if status not in STATUS:
            raise ValueError("Tình trạng không hợp lệ cho " + target)
        rows.append([target, info.get("name") or names.get(target, "Skin " + target),
                     STATUS.index(status), info.get("note", ""), sources])
    source_names = {s: names.get(s, "Mặc định" if s.endswith("00") else "Skin " + s)
                    for sources in groups.values() for s in sources}
    result = dict(download=link, summary=settings["summary"], heroes=len(ids),
                  states=STATUS, rows=rows, sources=source_names)
    write(DOCS / "catalog.json", result, True)
    return result


def admin(selected):
    catalog = build()
    settings = read("settings.json")
    row = next((r for r in catalog["rows"] if r[0] == selected), catalog["rows"][0])
    sid = row[0]
    def options(items, current):
        return "".join(f'<option value="{escape(key)}" {"selected" if key == current else ""}>{escape(label)}</option>'
                       for key, label in items)
    skins = options([(r[0], r[0] + " · " + r[1]) for r in catalog["rows"]], sid)
    states = options([(s, s) for s in STATUS], STATUS[row[2]])
    return f"""<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Quản lý ModIn1</title><link rel="stylesheet" href="/style.css"><main class="editor">
    <a href="/">Xem trang công khai</a><h1>Quản lý ModIn1</h1>
    <form method="post"><h2>Bản mod</h2><label>Link tải<input type="url" name="download" value="{escape(settings['download'])}"></label>
    <label>Tình trạng chung<textarea name="summary">{escape(settings['summary'])}</textarea></label><button>Lưu bản mod</button></form>
    <form method="get"><h2>Thông tin skin</h2><label>Chọn skin<select name="id">{skins}</select></label><button>Mở skin</button></form>
    <form method="post"><input type="hidden" name="id" value="{sid}"><label>Tên hiển thị<input name="name" value="{escape(row[1])}" required></label>
    <label>Tình trạng<select name="status">{states}</select></label><label>Ghi chú<textarea name="note">{escape(row[3])}</textarea></label>
    <button>Lưu skin {sid}</button></form></main></html>"""


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DOCS), **kwargs)

    def do_GET(self):
        url = urlsplit(self.path)
        if url.path != "/admin":
            return super().do_GET()
        selected = parse_qs(url.query).get("id", [""])[0]
        body = admin(selected).encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        origin = "http://127.0.0.1:" + str(self.server.server_port)
        if (urlsplit(self.path).path != "/admin" or self.headers.get("Origin") != origin
                or self.headers.get("Host") != urlsplit(origin).netloc):
            return self.send_error(403)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 65536:
                return self.send_error(413)
            fields = {k: v[0].strip() for k, v in parse_qs(self.rfile.read(length).decode(), keep_blank_values=True).items()}
            settings = read("settings.json")
            sid = fields.get("id", "")
            if sid:
                if sid not in {t for m in read("ids.json").values() for t in m.values()}:
                    raise ValueError("ID skin không hợp lệ")
                settings["skins"][sid] = {k: fields[k] for k in ("name", "status", "note")}
            else:
                settings.update({k: fields[k] for k in ("download", "summary")})
            build(settings)
            write(DATA / "settings.json", settings)
        except (KeyError, ValueError) as error:
            body = str(error).encode()
            self.send_response(400)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(303)
        self.send_header("Location", "/admin" + ("?id=" + sid if sid else ""))
        self.end_headers()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["serve", "build"], default="serve", nargs="?")
    parser.add_argument("--port", default=8765, type=int)
    parser.add_argument("--ids", type=Path)
    parser.add_argument("--names", type=Path)
    args = parser.parse_args()
    if args.ids:
        write(DATA / "ids.json", json.loads(args.ids.read_text(encoding="utf-8-sig")))
    if args.names:
        names = dict(re.findall(r"^-->\s*(\d+)\s*:[ \t]*(.+?)\s*$", args.names.read_text(encoding="utf-8-sig"), re.M))
        if not names:
            parser.error("File tên skin trống hoặc sai định dạng")
        write(DATA / "names.json", names)
    build()
    if args.command == "serve":
        server = HTTPServer(("127.0.0.1", args.port), Handler)
        print(f"http://127.0.0.1:{server.server_port}/admin", flush=True)
        server.serve_forever()
