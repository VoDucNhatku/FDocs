---
description: Kích hoạt khi người dùng mô tả một bug, paste stack trace, hoặc báo lỗi xảy ra trong ứng dụng. Trigger keywords: "lỗi", "bug", "error", "crash", "không hoạt động", "fix". Thực hiện đúng 3 phase theo thứ tự: Reproduce → Fix → Verify. Không bỏ qua phase.
allowed-tools: Read, Edit, MultiEdit, Bash(grep:*), Bash(cat:*), Bash(npm test:*), Bash(npm run test:*), Bash(git log:*), Bash(git diff:*)
---

Kích hoạt Workflow: Bug Fix. Thực hiện tuần tự các Phase sau:

## Phase 1 — Reproduce & Locate (Tester Worker)
1. Đọc mô tả lỗi hoặc stack trace từ người dùng.
2. Xác định lỗi xảy ra ở layer nào (Frontend / Backend / DB / DevOps).
3. Tái hiện lỗi — không bỏ qua bước này dù lỗi có vẻ rõ ràng.

## Phase 2 — Fix (Worker tương ứng với layer lỗi)
1. Đọc toàn bộ file liên quan trước khi sửa.
2. Sửa đúng nguyên nhân gốc rễ (root cause), không patch tạm.
3. Viết hoặc cập nhật test case bắt được lỗi này để tránh regression.

## Phase 3 — Verify (Tester Worker)
1. Chạy lại test liên quan đến bug vừa sửa.
2. Chạy regression test toàn bộ nếu có.
3. Xác nhận fix thành công và không có side effect.

**Handoff Rules**:
- Phải tái hiện được lỗi trước khi sửa — không sửa theo phỏng đoán.
- Mỗi bug fix phải đi kèm ít nhất 1 test case bắt được lỗi đó.

Bug cần xử lý: $ARGUMENTS
