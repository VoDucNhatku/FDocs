# Security Rules

## Dữ liệu đầu vào (Input)
- Validate **mọi** input từ người dùng ở phía server — không tin tưởng client.
- Sanitize dữ liệu trước khi đưa vào DB để tránh SQL Injection.
- Giới hạn kích thước payload (file upload, JSON body) ở tầng middleware.

## Xác thực & Phân quyền (AuthN/AuthZ)
- Dùng JWT hoặc session-based auth — không tự viết cơ chế mã hóa.
- Access token: TTL ngắn (15 phút). Refresh token: TTL dài, lưu an toàn (httpOnly cookie).
- Kiểm tra quyền ở tầng backend — không chỉ ẩn UI trên frontend.

## Secret Management
- Không hardcode password, API key, connection string vào source code.
- Không commit file `.env` có giá trị thật vào Git.
- Dùng GitHub Secrets hoặc biến môi trường của server khi deploy.

## HTTP Security Headers
Luôn cấu hình các header sau cho HTTP response:
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HTTPS only)

## Dependencies
- Không dùng thư viện không được maintain (last commit > 2 năm, không có security patch).
- Chạy `npm audit` hoặc `pip-audit` trước khi deploy lên production.
