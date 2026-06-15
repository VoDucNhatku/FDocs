---
description: Xây dựng ứng dụng hoàn chỉnh từ ý tưởng đến triển khai bằng cách phân công công việc tuần tự qua các Worker
---

# Workflow: Full Stack Build

**Mục tiêu**: Xây dựng ứng dụng hoàn chỉnh từ ý tưởng đến triển khai, bằng cách phân công công việc tuần tự qua các Worker chuyên biệt.

---

## Phase 1 — Discovery (Product Manager)

**Trigger**: Người dùng mô tả ý tưởng dự án bằng ngôn ngữ tự nhiên.

**Hành động**:
1. Dùng `/grill-me` để phỏng vấn người dùng, làm rõ: mục tiêu, đối tượng, tính năng cốt lõi, tính năng nằm ngoài phạm vi.
2. Viết tài liệu đặc tả yêu cầu ra `docs/PRD.md` theo cấu trúc:
   - **Goal**: Mục tiêu dự án
   - **Target Users**: Ai sẽ dùng
   - **Core Features**: Danh sách tính năng phải có (P0)
   - **Out of Scope**: Không làm trong phiên bản này
   - **Tech Stack**: Công nghệ được duyệt (để các Worker tuân thủ)
3. Xác nhận lại `PRD.md` với người dùng trước khi chuyển sang Phase 2.

**Đầu ra**: `docs/PRD.md`

---

## Phase 2 — Data Design (Database Worker)

**Điều kiện**: `PRD.md` đã được duyệt.

**Hành động**:
1. Đọc `docs/PRD.md`, xác định các thực thể (entities) và quan hệ (relations).
2. Thiết kế schema và lưu vào `docs/schema.md` với:
   - Sơ đồ ERD dạng text (Mermaid)
   - Danh sách bảng, cột, kiểu dữ liệu, khóa
3. Tạo file migration/seed ban đầu nếu cần.

**Đầu ra**: `docs/schema.md`, migration files.

---

## Phase 3 — Back-end Development (Back-end Worker)

**Điều kiện**: `schema.md` hoàn tất.

**Hành động**:
1. Đọc `PRD.md` và `schema.md`.
2. Khởi tạo server, kết nối DB theo tech stack đã định trong PRD.
3. Xây dựng toàn bộ API endpoints theo danh sách tính năng P0.
4. Ghi tài liệu API (endpoint, method, request/response payload) vào `docs/API.md`.

**Đầu ra**: Source code Back-end, `docs/API.md`.

---

## Phase 4 — Front-end Development (Front-end Worker)

**Điều kiện**: `API.md` hoàn tất.

**Hành động**:
1. Đọc `PRD.md` và `docs/API.md`.
2. Xây dựng giao diện theo từng tính năng P0.
3. Tích hợp gọi API thực tế (không dùng mock data nếu server đã chạy).
4. Đảm bảo responsive trên các breakpoint chuẩn (mobile/tablet/desktop).

**Đầu ra**: Source code Front-end.

---

## Phase 5 — Quality Assurance (Tester Worker)

**Điều kiện**: Back-end và Front-end đã hoàn tất Phase 3 & 4.

**Hành động**:
1. Viết Unit Tests cho các hàm xử lý logic Back-end.
2. Viết Integration Tests cho từng API endpoint (dùng dữ liệu thực từ DB test).
3. Viết E2E Tests cho các user flow chính trên UI (Playwright hoặc Cypress).
4. Báo cáo lỗi và tự động sửa nếu lỗi đơn giản; escalate lại Worker gốc nếu lỗi phức tạp.

**Đầu ra**: Test files, báo cáo coverage.

---

## Phase 6 — Deployment (DevOps Worker)

**Điều kiện**: Tất cả tests Phase 5 đều pass.

**Hành động**:
1. Viết `Dockerfile` cho từng service (client, server, db).
2. Viết `docker-compose.yml` để chạy toàn bộ stack cục bộ.
3. Cấu hình CI/CD pipeline (GitHub Actions) để tự động test và deploy khi push lên `main`.
4. Xác nhận ứng dụng chạy đúng trên môi trường production.

**Đầu ra**: `Dockerfile`, `docker-compose.yml`, `.github/workflows/deploy.yml`.

---

## Handoff Rules (Quy tắc chuyển giao)

- Mỗi Phase chỉ bắt đầu khi Phase trước có **đầu ra rõ ràng**.
- Nếu phát hiện mâu thuẫn với PRD trong quá trình làm, Worker phải **báo cáo ngay** thay vì tự ý thay đổi.
- Tất cả tài liệu được lưu tập trung trong thư mục `docs/` của project.
