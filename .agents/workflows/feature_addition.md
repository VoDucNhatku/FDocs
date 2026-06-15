---
description: Thêm một tính năng mới vào dự án đã có sẵn mà không phá vỡ code hiện tại
---

# Workflow: Feature Addition

**Mục tiêu**: Thêm một tính năng mới vào dự án đã có sẵn mà không phá vỡ code hiện tại.

---

## Phase 1 — Scope (Product Manager)

**Trigger**: Người dùng yêu cầu thêm tính năng mới.

**Hành động**:
1. Đọc `docs/PRD.md` hiện có để hiểu phạm vi dự án.
2. Xác định rõ: tính năng mới cần gì, ảnh hưởng đến module nào, có breaking change không.
3. Ghi bổ sung vào `docs/PRD.md` (section "Additions").

**Đầu ra**: `docs/PRD.md` đã cập nhật.

---

## Phase 2 — Impact Analysis (Back-end Worker hoặc Database Worker)

**Hành động**:
1. Xác định xem tính năng mới có cần thêm bảng/cột DB không → Database Worker xử lý trước.
2. Xác định API mới hoặc sửa API cũ → Back-end Worker xử lý.
3. Cập nhật `docs/API.md` nếu có thay đổi endpoint.

---

## Phase 3 — Implementation (Front-end Worker)

1. Đọc thay đổi API trong `docs/API.md`.
2. Thêm/sửa component UI liên quan đến tính năng mới.
3. Đảm bảo không phá vỡ các luồng UI hiện có.

---

## Phase 4 — Regression Testing (Tester Worker)

1. Viết test cho tính năng mới.
2. Chạy lại toàn bộ test cũ để kiểm tra regression.
3. Báo cáo kết quả.

---

## Handoff Rules

- Không bao giờ sửa code hiện tại mà không đọc file liên quan trước.
- Mọi thay đổi DB phải đi kèm migration file, không sửa schema trực tiếp.
