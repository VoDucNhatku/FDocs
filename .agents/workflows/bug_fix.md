---
description: Xác định chính xác nguồn gốc bug và sửa nhanh mà không gây side effect
---

# Workflow: Bug Fix

**Mục tiêu**: Xác định chính xác nguồn gốc bug và sửa nhanh mà không gây side effect.

---

## Phase 1 — Reproduce & Locate (Tester Worker)

**Trigger**: Người dùng mô tả lỗi hoặc paste stack trace.

**Hành động**:
1. Tái hiện lỗi bằng cách đọc log/stack trace.
2. Xác định: lỗi xảy ra ở layer nào (Frontend / Backend / DB / DevOps)?
3. Chỉ định Worker phù hợp xử lý ở Phase 2.

---

## Phase 2 — Fix (Worker tương ứng)

**Hành động**:
1. Đọc toàn bộ file liên quan trước khi sửa.
2. Sửa đúng nguyên nhân gốc rễ (root cause), không patch tạm.
3. Viết/cập nhật test case bắt được lỗi này (để tránh regression).

---

## Phase 3 — Verify (Tester Worker)

1. Chạy lại test liên quan đến bug vừa sửa.
2. Chạy regression test toàn bộ.
3. Xác nhận fix thành công và không có side effect.

---

## Handoff Rules

- Phải tái hiện được lỗi trước khi sửa — không sửa theo phỏng đoán.
- Mỗi bug fix phải đi kèm ít nhất 1 test case bắt được lỗi đó.
