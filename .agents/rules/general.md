---
trigger: always_on
---

# General Rules

## Language & Communication
- Phản hồi bằng **tiếng Việt**.
- Ngắn gọn, trực tiếp, đủ thông tin — không dùng ví dụ mơ hồ hay placeholder chung chung như `foo`, `bar`.
- Không tóm tắt lại những gì vừa làm ở cuối phản hồi — người dùng đọc được diff.

## Code Behavior
- Ưu tiên **chỉnh sửa file có sẵn** hơn là tạo file mới.
- Không thêm comment giải thích hiển nhiên vào code.
- Dùng tên biến/hàm có nghĩa thực tế — code tự giải thích.
- Không hardcode secret, URL, API key — luôn dùng biến môi trường.

## Decision Making
- Nếu yêu cầu không rõ ràng → hỏi trực tiếp, không tự suy đoán rồi làm.
- Nếu có nhiều cách giải quyết → trình bày các lựa chọn và đề xuất 1 cách cụ thể.
- Không thực hiện thay đổi lớn (refactor, đổi kiến trúc) khi chưa được xác nhận.

## File & Documentation
- Tất cả tài liệu dự án lưu trong `docs/` (PRD.md, API.md, schema.md, PROGRESS.md).
- Tất cả file môi trường mẫu lưu trong `.env.example`, không commit `.env` thật.
