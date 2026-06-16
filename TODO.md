# FDocs — TODO

## Deploy to Production

- [ ] Tạo SSH key pair cho deploy: `ssh-keygen -t ed25519 -C "fdocs-deploy" -f ~/.ssh/fdocs_deploy`
- [ ] Copy public key lên server: `echo "<public_key>" >> ~/.ssh/authorized_keys`
- [ ] Thêm secret `DEPLOY_HOST` vào GitHub repo (Settings → Secrets and variables → Actions)
- [ ] Thêm secret `DEPLOY_USER` vào GitHub repo
- [ ] Thêm secret `DEPLOY_SSH_KEY` vào GitHub repo (nội dung file `~/.ssh/fdocs_deploy`)
- [ ] Copy file `.env` lên server tại `~/fdocs/.env` với giá trị production thật

## Features

- [x] **SSE Progress cho Upload**: `POST /api/documents` trả `202 + job_id` ngay; pipeline chunk→embed→save chạy nền (`asyncio.create_task`, session DB riêng); `GET /api/upload/{job_id}/progress` phát SSE `{status, step, progress, doc_id?, error?}`; frontend (`UploadPage`) hiển thị progress bar realtime qua fetch-based SSE. Loại bỏ nguy cơ 504. (Phase 9)
  - Hạn chế còn lại: job store in-memory → chỉ chạy đúng với **1 worker**. Multi-worker cần shared bus (Redis) — xem ghi chú trong `docs/API.md`.
