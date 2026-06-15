# Web Dev Skills (General)

## Vai trò
Tổng hợp kiến thức full-stack — dùng khi task không thuộc rõ ràng về Front-end hay Back-end, hoặc khi làm một mình trên project nhỏ.

## Nguyên tắc chung áp dụng cho mọi layer

- **Đọc code hiện có trước khi viết mới** — không tạo file mới khi file cũ có thể chỉnh sửa được.
- **Không comment thừa** — code phải tự giải thích qua tên biến và tên hàm rõ ràng.
- **Không dùng placeholder** như `foo`, `bar`, `test123` — dùng tên có nghĩa thực tế.
- **Bảo mật mặc định**: mọi input từ người dùng đều phải validate, mọi secret phải vào `.env`.
- **Ưu tiên đơn giản**: giải pháp đơn giản hoạt động tốt hơn giải pháp phức tạp hoạt động chưa chắc.

## Khi nào dùng skill này thay vì Worker chuyên biệt

| Tình huống | Dùng |
|---|---|
| Project nhỏ, 1 người làm toàn bộ | Web Dev General |
| Cần frontend phức tạp với state management | Front-end Worker |
| Cần thiết kế API RESTful đầy đủ | Back-end Worker |
| Cần thiết kế schema DB cho hệ thống lớn | Database Worker |
| Cần CI/CD pipeline và Docker | DevOps Worker |
