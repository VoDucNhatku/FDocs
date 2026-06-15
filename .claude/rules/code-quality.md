# Code Quality Rules

## Nguyên tắc chung
- Mỗi function/component chỉ làm **một việc** (Single Responsibility).
- Không lồng if/else quá 3 cấp — refactor thành guard clause hoặc tách function.
- DRY: Nếu một đoạn logic lặp 3 lần trở lên → tách thành hàm/module riêng.
- Không để dead code (commented-out code, unused import, unused variable) trong source.

## Naming Convention
- **biến/hàm**: `camelCase`
- **class/component**: `PascalCase`
- **hằng số**: `UPPER_SNAKE_CASE`
- **file**: `kebab-case.ts` (ví dụ: `user-service.ts`, `auth-middleware.ts`)

## Error Handling
- Không bao giờ bắt lỗi rồi bỏ qua im lặng (silent catch).
- Mọi lỗi phải được log rõ context (file nào, function nào, input là gì).
- Trả về error message có nghĩa cho client, không expose stack trace ra ngoài.

## Git & Version Control
- Mỗi commit chỉ làm một việc — không gộp "fix bug + add feature" vào cùng commit.
- Commit message theo format: `type(scope): mô tả ngắn`
  - `feat(auth): add JWT refresh token`
  - `fix(api): handle null user in /me endpoint`
  - `refactor(db): extract query logic into repository`
- Không commit trực tiếp lên `main` — dùng branch và pull request.
