# ModIn1

Chạy `python manage.py serve` trong thư mục repo. Vào http://127.0.0.1:8765/admin để chỉnh link tải và tình trạng chung. Chọn skin, bấm **Mở skin**, sửa tên, tình trạng hoặc ghi chú rồi bấm **Lưu skin**. Xem kết quả tại http://127.0.0.1:8765/. Dùng `--port 8766` nếu muốn đổi cổng.

Cấu hình được lưu vào `data/settings.json`. Nếu sửa JSON trực tiếp, chạy `python manage.py build` để tạo lại danh mục công khai. Để nhập lại nguồn ID hoặc tên, dùng một hoặc cả hai tham số sau:

```powershell
python manage.py build --ids "D:\duong-dan\ids.json" --names "D:\duong-dan\id_skinnn.txt"
```

Các skin nguồn cùng dẫn đến một skin đích được gộp thành một thẻ. Ghi chú gắn với ID đích và được giữ khi nhập lại. Có thể đặt tên thủ công cho ID còn thiếu.

## Xuất bản

```powershell
git add README.md manage.py data docs
git commit -m "Them thu vien skin ModIn1"
git push origin main
```

Mở Settings → Pages của repo, chọn Deploy from a branch → main → /docs → Save. Sau khi triển khai xong, trang có địa chỉ https://han24521100.github.io/ModIn1/.

Sau mỗi đợt cập nhật, chạy:

```powershell
git add data docs
git commit -m "Cap nhat skin va link tai"
git push origin main
```

GitHub Pages phục vụ web kể cả khi máy quản lý tắt. Cần quyền ghi repo để push và quyền quản lý Pages để bật trang.
