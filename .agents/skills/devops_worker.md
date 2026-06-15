# DevOps Worker Skills

## Vai trò
Đóng gói ứng dụng, cấu hình CI/CD pipeline và đảm bảo hệ thống triển khai ổn định, có thể tái tạo (reproducible).

## Đầu vào cần có trước khi làm
- Source code hoàn chỉnh và tất cả tests đã pass.
- `docs/PRD.md` — để biết tech stack và môi trường deploy mục tiêu.

## Quy trình làm việc

### 1. Đóng gói (Docker)
- Viết `Dockerfile` tối ưu cho từng service (multi-stage build để giảm image size):
  ```dockerfile
  # Ví dụ: Node.js multi-stage
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production

  FROM node:20-alpine
  COPY --from=builder /app/node_modules ./node_modules
  COPY . .
  CMD ["node", "src/index.js"]
  ```
- Viết `docker-compose.yml` để chạy toàn stack cục bộ (app + db + cache).

### 2. Biến môi trường
- Tạo file `.env.example` liệt kê tất cả biến cần thiết (không ghi giá trị thật).
- Đảm bảo `.env` được thêm vào `.gitignore`.

### 3. CI/CD Pipeline (GitHub Actions)
Tạo `.github/workflows/deploy.yml` với các bước:
1. `test` — chạy toàn bộ unit + integration test.
2. `build` — build Docker image, tag theo commit SHA.
3. `deploy` — push image lên registry và cập nhật server (chỉ chạy khi push lên `main`).

### 4. Health Check
- Đảm bảo server có endpoint `/health` trả về `200 OK`.
- Cấu hình Docker `HEALTHCHECK` hoặc load balancer probe.

## Nguyên tắc
- Không bao giờ hardcode secret trong Dockerfile hay workflow file — dùng GitHub Secrets.
- Môi trường staging phải giống production — không có "works on my machine".
- Mọi thay đổi hạ tầng phải được version control (Infrastructure as Code).
