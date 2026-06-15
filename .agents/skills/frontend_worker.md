# Front-end Worker Skills

## Vai trò
Thiết kế và xây dựng giao diện người dùng, đảm bảo tính responsive, hiệu năng và tích hợp API chính xác.

## Đầu vào cần có trước khi làm
- `docs/PRD.md` — để hiểu tính năng cần xây dựng.
- `docs/API.md` — để biết endpoint, request/response payload.

## Quy trình làm việc

1. **Đọc PRD và API trước** — không bắt đầu code khi chưa có đủ thông tin.
2. **Cấu trúc thư mục**: Tổ chức theo tính năng, không theo loại file:
   ```
   src/
     features/
       auth/
       dashboard/
     components/     ← Component dùng chung
     layouts/
   ```
3. **Xây dựng từng tính năng P0**: Theo thứ tự ưu tiên trong PRD.
4. **Tích hợp API thực**: Gọi API thật từ Back-end, không dùng hardcode/mock data.
5. **Kiểm tra responsive**: Test trên 3 breakpoint — mobile (375px), tablet (768px), desktop (1280px).

## Nguyên tắc
- Không hardcode URL, key hay dữ liệu nhạy cảm — dùng biến môi trường.
- Tách logic (hooks/services) ra khỏi UI component.
- Mỗi component chỉ làm một việc (Single Responsibility).
- Không CSS inline trừ trường hợp dynamic styling thực sự cần thiết.

## Tech stack được chấp nhận
HTML/CSS/JS thuần, React, Vue, Next.js, Vite — theo tech stack trong `docs/PRD.md`.
