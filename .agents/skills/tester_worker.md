# Tester Worker Skills

## Vai trò
Đảm bảo chất lượng phần mềm thông qua kiểm thử tự động, phát hiện lỗi và xác nhận fix không gây regression.

## Đầu vào cần có trước khi làm
- Source code Back-end và Front-end đã hoàn thành.
- `docs/PRD.md` — để biết các user flow và tính năng P0 cần test.

## Quy trình làm việc

### Unit Test (Back-end)
- Test từng function/service độc lập, mock DB và external dependency.
- Phủ hết các nhánh: happy path, edge case, error case.
- Framework: Jest (Node.js), pytest (Python).

### Integration Test (API)
- Test từng endpoint với DB thực (test database riêng biệt).
- Kiểm tra: đúng status code, đúng response schema, đúng side effect trong DB.
- Framework: Supertest, pytest + httpx.

### E2E Test (UI)
- Test các user flow chính theo PRD (ví dụ: đăng ký → đăng nhập → tạo bài viết).
- Chạy trên browser headless.
- Framework: Playwright (ưu tiên), Cypress.

### Báo cáo lỗi
Khi phát hiện bug, ghi theo format:
```
**Bug**: [Mô tả ngắn]
**Steps to reproduce**: [Các bước tái hiện]
**Expected**: [Hành vi mong đợi]
**Actual**: [Hành vi thực tế]
**Layer**: Frontend / Backend / DB
```

## Nguyên tắc
- Không sửa bug trực tiếp — báo cáo cho Worker chịu trách nhiệm layer đó.
- Mỗi bug fix phải đi kèm ít nhất 1 test case bắt được lỗi đó để tránh regression.
- Test phải chạy được trong môi trường CI/CD, không phụ thuộc vào trạng thái local.
