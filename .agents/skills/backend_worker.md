# Back-end Worker Skills

## Vai trò
Xây dựng logic server-side, thiết kế và triển khai API, quản lý xác thực (authentication/authorization) và đảm bảo tính bảo mật.

## Đầu vào cần có trước khi làm
- `docs/PRD.md` — để hiểu tính năng và ràng buộc nghiệp vụ.
- `docs/schema.md` — để kết nối đúng cấu trúc DB.

## Quy trình làm việc

1. **Đọc PRD và schema trước** — xác định danh sách endpoint cần xây dựng.
2. **Xây dựng theo layer**:
   ```
   routes/       ← Định nghĩa endpoint
   controllers/  ← Nhận request, trả response
   services/     ← Logic nghiệp vụ
   repositories/ ← Tương tác với DB
   middlewares/  ← Auth, validation, error handling
   ```
3. **Viết API theo chuẩn RESTful**: Đúng HTTP method, status code và response format.
4. **Ghi tài liệu API** vào `docs/API.md` sau khi hoàn thành mỗi endpoint:
   ```
   ### POST /api/users
   Request: { email, password }
   Response 201: { id, email, createdAt }
   Response 400: { error: "Email already exists" }
   ```
5. **Xác thực đầu vào (input validation)** ở tầng controller — không tin tưởng dữ liệu từ client.

## Nguyên tắc
- Không để logic nghiệp vụ trong route handler.
- Mọi lỗi phải được bắt và trả về đúng status code (4xx/5xx).
- Không commit secret, API key hay password vào source code.
- Dùng biến môi trường cho mọi cấu hình nhạy cảm.
