const el = id => document.getElementById(id);

function node(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  return item;
}

const fold = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

function skinRow([id, name, status, note, sources], data) {
  const row = node('article', undefined, 'card');
  const target = node('div', undefined, 'target');
  const portrait = node('div', undefined, 'portrait');
  const img = node('img');
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.onerror = () => { portrait.textContent = id; };
  img.src = 'https://dl.ops.kgvn.garenanow.com/hok/VN/HeroHeadPath/30' + id.slice(0, -2) + Number(id.slice(-2)) + 'head.jpg';
  portrait.append(img);
  const title = node('div');
  title.append(node('span', 'Skin sau khi mod', 'mobile-label'), node('h3', name), node('span', 'ID ' + id, 'meta'));
  target.append(portrait, title);

  const choices = node('div', undefined, 'choices');
  const list = node('ul');
  for (const source of sources) {
    const li = node('li', data.sources[source] + ' ');
    li.append(node('small', source));
    list.append(li);
  }
  choices.append(node('span', 'Chọn trong game', 'mobile-label'), list);

  const info = node('div', undefined, 'condition');
  info.append(node('span', data.states[status], 'badge s' + status));
  if (note) info.append(node('p', note, 'note'));
  row.append(target, choices, info);
  return row;
}

async function start() {
  const response = await fetch('catalog.json', {cache: 'no-cache'});
  if (!response.ok) throw Error();
  const data = await response.json();
  if (data.summary) {
    el('summary').textContent = data.summary;
    el('summary').hidden = false;
  }
  el('stats').textContent = data.rows.length + ' skin · ' + data.heroes + ' tướng';
  data.states.forEach((name, i) => el('state').add(new Option(name, i)));
  const search = data.rows.map(([id, name,,, sources]) => fold([id, name, ...sources.map(s => s + ' ' + data.sources[s])].join(' ')));
  const pickers = [el('top-page'), el('page')];
  let page = 0;

  function render() {
    const size = Number(el('size').value);
    const query = fold(el('query').value.trim());
    const state = el('state').value;
    const matches = data.rows.filter((row, i) => search[i].includes(query) && (state === '' || row[2] === Number(state)));
    const first = page * size;
    const last = Math.min(first + size, matches.length);
    const pages = Math.ceil(matches.length / size);
    el('grid').replaceChildren(...matches.slice(first, last).map(row => skinRow(row, data)));
    el('message').textContent = pages ? 'Hiển thị ' + (first + 1) + '–' + last + ' trong ' + matches.length + ' skin' : 'Không tìm thấy skin phù hợp.';
    el('empty').hidden = pages > 0 || (!query && !state);
    el('catalog').hidden = pages === 0;
    for (const picker of pickers) {
      if (picker.options.length !== pages) {
        picker.replaceChildren(...Array.from({length: pages}, (_, i) => new Option(i + 1, i)));
      }
      picker.value = String(page);
    }
    el('pages').textContent = pages;
    el('top-jump').hidden = pages <= 1;
    el('pager').hidden = pages <= 1;
    el('prev').disabled = page === 0;
    el('next').disabled = page + 1 >= pages;
  }

  function move(to, scroll = false) {
    page = to;
    render();
    if (scroll) el('library').scrollIntoView();
  }
  el('query').oninput = () => move(0);
  el('state').onchange = () => move(0);
  el('size').onchange = () => move(0);
  el('top-page').onchange = event => move(Number(event.target.value));
  el('page').onchange = event => move(Number(event.target.value), true);
  el('next').onclick = () => move(page + 1, true);
  el('prev').onclick = () => move(page - 1, true);
  el('clear').onclick = () => {
    el('query').value = '';
    el('state').value = '';
    move(0);
    el('query').focus();
  };
  render();
}

start().catch(() => { el('message').textContent = 'Chưa tải được danh sách skin. Hãy tải lại trang.'; });
