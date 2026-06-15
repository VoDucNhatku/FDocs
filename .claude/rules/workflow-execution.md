# Workflow Execution Rules

## Trước khi bắt đầu bất kỳ tác vụ nào
- Đọc `docs/PRD.md` nếu file tồn tại — không làm việc theo trí nhớ.
- Đọc file liên quan trong codebase trước khi chỉnh sửa.
- Xác nhận đầu vào (input artifact) từ Phase trước đã có đủ trước khi bắt đầu Phase mới.

## Trong khi thực hiện
- Làm theo từng Phase trong workflow — không bỏ qua bước.
- Nếu phát hiện mâu thuẫn với PRD → dừng lại và báo cáo, không tự ý quyết định.
- Mỗi Worker chỉ làm đúng phạm vi của mình — không làm thay Worker khác.

## Sau khi hoàn thành
- Cập nhật `docs/PROGRESS.md` với trạng thái Phase vừa xong.
- Ghi rõ đầu ra (output artifact) đã tạo ở đâu để Worker tiếp theo biết đường lấy.
- Không tự ý chuyển sang Phase tiếp theo khi chưa được xác nhận.

## Khi gặp lỗi hoặc bất ngờ
- Không im lặng tiếp tục — báo cáo ngay với context đầy đủ.
- Không sửa lỗi ở layer khác — escalate đúng Worker chịu trách nhiệm.
