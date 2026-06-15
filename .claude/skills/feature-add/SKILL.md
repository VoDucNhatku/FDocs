---
description: Kích hoạt khi người dùng yêu cầu thêm tính năng mới vào dự án đã có code. Trigger keywords: "thêm tính năng", "add feature", "tích hợp thêm", "bổ sung", "muốn có thêm". Thực hiện đúng 4 phase theo thứ tự: as-pm (Scope) → as-db/as-backend (Impact Analysis) → as-frontend (Implementation) → as-tester (Regression Test). Không bắt đầu code khi PRD chưa được duyệt.
allowed-tools: Read, Edit, MultiEdit, Write, Bash(grep:*), Bash(cat:*), Bash(npm test:*), Bash(npm run test:*), Bash(git log:*), Bash(git diff:*)
---

Kích hoạt Workflow: Feature Addition. Thực hiện tuần tự — xác nhận người dùng sau mỗi Phase trước khi tiếp tục:

## Phase 1 — Scope [as-pm]
1. Đọc `docs/PRD.md` để hiểu phạm vi hiện tại.
2. Xác định rõ: tính năng mới cần gì, ảnh hưởng module nào, có breaking change không.
3. Ghi bổ sung vào `docs/PRD.md` (section "Additions") và xác nhận với người dùng.

**Đầu ra**: `docs/PRD.md` đã cập nhật. **Dừng để xác nhận.**

## Phase 2 — Impact Analysis [as-db → as-backend]
1. Xác định tính năng có cần thêm bảng/cột DB → as-db xử lý trước.
2. Xác định API mới hoặc sửa API cũ → as-backend xử lý.
3. Cập nhật `docs/API.md` nếu có thay đổi endpoint.

## Phase 3 — Implementation [as-frontend]
1. Đọc thay đổi API trong `docs/API.md`.
2. Thêm/sửa component UI liên quan đến tính năng mới.
3. Đảm bảo không phá vỡ các luồng UI hiện có.

## Phase 4 — Regression Testing [as-tester]
1. Viết test cho tính năng mới.
2. Chạy toàn bộ test cũ để kiểm tra regression.
3. Báo cáo kết quả.

**Handoff Rules**:
- Không bao giờ sửa code hiện tại mà không đọc file liên quan trước.
- Mọi thay đổi DB phải đi kèm migration file, không sửa schema trực tiếp.

Tính năng cần thêm: $ARGUMENTS
