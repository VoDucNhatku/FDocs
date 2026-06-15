---
description: Kích hoạt khi người dùng muốn xây dựng ứng dụng hoàn chỉnh từ đầu, hoặc bắt đầu một dự án mới. Trigger keywords: "build app", "xây dựng", "dự án mới", "full stack", "từ đầu", "bắt đầu dự án". Thực hiện đúng 6 phase theo thứ tự bắt buộc: as-pm → as-db → as-backend → as-frontend → as-tester → as-devops. Dừng để xác nhận sau mỗi Phase.
allowed-tools: Read, Edit, MultiEdit, Write, Bash(grep:*), Bash(cat:*), Bash(npm:*), Bash(git:*), Bash(docker:*), Bash(mkdir:*), Bash(touch:*)
---

Kích hoạt Workflow: Full Stack Build. Thứ tự Phase bắt buộc: **as-pm → as-db → as-backend → as-frontend → as-tester → as-devops**. Dừng để xác nhận sau mỗi Phase.

## Phase 1 — Discovery [as-pm]
1. Phỏng vấn người dùng để làm rõ: mục tiêu, đối tượng, tính năng P0, ngoài phạm vi.
2. Viết `docs/PRD.md` với cấu trúc: Goal / Target Users / Core Features / Out of Scope / Tech Stack.
3. Xác nhận với người dùng. **Dừng — không tiếp tục khi PRD chưa được duyệt.**

**Đầu ra**: `docs/PRD.md`

## Phase 2 — Data Design [as-db]
Điều kiện: `PRD.md` đã được duyệt.
1. Đọc `docs/PRD.md`, xác định entities và relations.
2. Thiết kế schema, lưu vào `docs/schema.md` (ERD Mermaid + bảng chi tiết).
3. Tạo migration/seed file nếu cần.

**Đầu ra**: `docs/schema.md`, migration files. **Dừng để xác nhận.**

## Phase 3 — Backend Development [as-backend]
Điều kiện: `schema.md` hoàn tất.
1. Đọc `PRD.md` và `schema.md`.
2. Khởi tạo server, kết nối DB theo tech stack trong PRD.
3. Build toàn bộ API endpoints (P0 features).
4. Ghi tài liệu API vào `docs/API.md`.

**Đầu ra**: Backend source code, `docs/API.md`. **Dừng để xác nhận.**

## Phase 4 — Frontend Development [as-frontend]
Điều kiện: `API.md` hoàn tất.
1. Đọc `PRD.md` và `docs/API.md`.
2. Build UI theo từng tính năng P0, tổ chức theo `src/features/`.
3. Tích hợp API thực tế, kiểm tra responsive (375px / 768px / 1280px).

**Đầu ra**: Frontend source code. **Dừng để xác nhận.**

## Phase 5 — Quality Assurance [as-tester]
Điều kiện: Backend và Frontend Phase 3 & 4 hoàn tất.
1. Unit Tests cho hàm logic Backend.
2. Integration Tests cho từng API endpoint.
3. E2E Tests cho user flows chính (Playwright hoặc Cypress).
4. Báo cáo kết quả — escalate lỗi phức tạp về Worker gốc.

**Đầu ra**: Test files, báo cáo coverage. **Dừng để xác nhận.**

## Phase 6 — Deployment [as-devops]
Điều kiện: Tất cả tests Phase 5 pass.
1. `Dockerfile` cho từng service (client, server, db).
2. `docker-compose.yml` cho local stack.
3. CI/CD pipeline `.github/workflows/deploy.yml` — auto test & deploy khi push `main`.

**Đầu ra**: Dockerfile, docker-compose.yml, deploy.yml.

**Handoff Rules**: Mỗi Phase chỉ bắt đầu khi Phase trước có đầu ra rõ ràng. Phát hiện mâu thuẫn với PRD → báo cáo ngay, không tự ý thay đổi.

Mô tả dự án: $ARGUMENTS
