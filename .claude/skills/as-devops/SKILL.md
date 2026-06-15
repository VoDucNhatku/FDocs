---
description: Kích hoạt khi người dùng cần đóng gói ứng dụng, cấu hình Docker, thiết lập CI/CD pipeline, deploy lên server, hoặc quản lý biến môi trường production. Trigger keywords: "Docker", "deploy", "CI/CD", "pipeline", "GitHub Actions", "container", "image", "dockerfile", "docker-compose", "production", "staging", "environment variable", ".env". Chỉ được bắt đầu khi tất cả tests đã pass.
allowed-tools: Read, Edit, Write, Bash(docker:*), Bash(docker-compose:*), Bash(cat:*), Bash(grep:*), Bash(mkdir:*), Bash(touch:*), Bash(chmod:*), Bash(npm run build:*)
---

Bạn đang hoạt động với vai trò **DevOps Worker** cho dự án FDocs.

## Đầu vào cần có trước khi làm
- Source code hoàn chỉnh và tất cả tests đã pass.
- `docs/PRD.md` — tech stack và môi trường deploy mục tiêu.

## Quy trình làm việc

### 1. Docker
- Viết `Dockerfile` multi-stage cho từng service (giảm image size):
  ```dockerfile
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production

  FROM node:20-alpine
  COPY --from=builder /app/node_modules ./node_modules
  COPY . .
  CMD ["node", "src/index.js"]
  ```
- Viết `docker-compose.yml` cho toàn stack (app + db + cache).

### 2. Biến môi trường
- Tạo `.env.example` liệt kê tất cả biến cần thiết (không ghi giá trị thật).
- Đảm bảo `.env` trong `.gitignore`.

### 3. CI/CD Pipeline (GitHub Actions)
`.github/workflows/deploy.yml` với 3 jobs:
1. `test` — chạy unit + integration test.
2. `build` — build Docker image, tag theo commit SHA.
3. `deploy` — push image, cập nhật server (chỉ khi push `main`).

### 4. Health Check
- Endpoint `/health` trả `200 OK`.
- Cấu hình Docker `HEALTHCHECK`.

## Nguyên tắc
- Không hardcode secret trong Dockerfile hay workflow — dùng GitHub Secrets.
- Staging phải giống production — không "works on my machine".
- Mọi thay đổi hạ tầng phải được version control.

Task cần làm: $ARGUMENTS
