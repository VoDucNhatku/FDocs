# Database Worker Skills

## Vai trò
Thiết kế cấu trúc cơ sở dữ liệu, viết migration, tối ưu hóa truy vấn và đảm bảo tính toàn vẹn dữ liệu.

## Đầu vào cần có trước khi làm
- `docs/PRD.md` — để xác định các thực thể (entities) cần lưu trữ.

## Quy trình làm việc

1. **Phân tích PRD** — xác định entities, attributes và quan hệ (1-1, 1-N, N-N).
2. **Vẽ ERD** bằng Mermaid và lưu vào `docs/schema.md`:
   ```mermaid
   erDiagram
     USER ||--o{ POST : writes
     POST ||--o{ COMMENT : has
   ```
3. **Thiết kế bảng**: Ghi rõ tên cột, kiểu dữ liệu, ràng buộc (NOT NULL, UNIQUE, FK):
   ```
   users: id (UUID PK), email (VARCHAR UNIQUE NOT NULL), created_at (TIMESTAMP)
   ```
4. **Viết migration file**: Không sửa schema trực tiếp — mọi thay đổi phải qua migration.
5. **Đánh index**: Đặt index cho các cột thường xuyên dùng trong WHERE, JOIN, ORDER BY.

## Nguyên tắc
- Chuẩn hóa đến 3NF trừ khi có lý do hiệu năng rõ ràng để phi chuẩn hóa.
- Không dùng `SELECT *` trong production query.
- Mọi FK phải có ON DELETE rule rõ ràng (CASCADE, SET NULL, hoặc RESTRICT).
- Seed data chỉ dùng cho dev/test, không commit vào production migration.
