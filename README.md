# StudyFlow V6.1 — bản cuối

StudyFlow V6.1 kế thừa công cụ học tập V5/V6 và thêm bảng viết tay, nhiều thú cưng, thử thách ngày, chuỗi ngày, bảng thành tích cục bộ và hỗ trợ gửi ảnh đến AI qua backend tương thích OpenAI.

## Dùng nhanh trên Android
- Mở `StudyFlow_V6.1.html` để dùng các tính năng chạy trong trình duyệt. Một số tính năng PWA/AI cần HTTPS hoặc máy chủ.
- Hoặc giải nén ZIP, cài Node.js 20+, cấu hình `.env` từ `.env.example`, rồi chạy `node --env-file=.env server.mjs`. Mở `http://localhost:8787`.
- Dữ liệu học, bảng viết, thú cưng và chuỗi thử thách được lưu cục bộ trong trình duyệt. Hãy sao lưu khi đổi thiết bị.

## Tính năng V6.1
- Giữ các tính năng V5/V6: môn học, quiz, flashcard, Pomodoro, ghi chú, thống kê, thi thử, trợ lý AI văn bản, lịch/mục tiêu/ôn tập, ngân hàng câu hỏi, tùy chỉnh giao diện, giọng nói nếu trình duyệt hỗ trợ, sao lưu/khôi phục.
- Vườn thú: nhận nuôi tối đa 12 loại/thú cưng trong các loài có sẵn; đặt tên, chọn thú đang chăm sóc, cho ăn/chơi, XP và cấp độ.
- Bảng Toán/Vật lí/Hóa học: vẽ bằng chuột/ngón tay, chọn màu/nét, tẩy, ghi công thức bằng bàn phím, lưu cục bộ và xuất PNG.
- Thử thách ngày, chuỗi ngày, điểm và thành tích lưu trên thiết bị; mẫu kế hoạch học tập cục bộ.
- AI giải ảnh: chọn ảnh PNG/JPEG/WEBP/GIF tối đa 5 MB, nhấn gửi; backend chuyển ảnh tới model vision. Chỉ hoạt động khi nhà cung cấp/model hỗ trợ image input.

## Cần máy chủ/API
- AI văn bản và giải ảnh cần Node.js backend, khóa API hợp lệ đặt trong biến môi trường máy chủ (`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`).
- `AI_BASE_URL` phải là base URL tương thích Chat Completions; model cần hỗ trợ đúng loại yêu cầu. Không phải mọi model văn bản đều đọc được ảnh.
- Nếu dùng API key thật, đừng đặt trong HTML, ZIP công khai hoặc Git. Nếu từng dán khóa vào cuộc trò chuyện, hãy thu hồi khóa cũ và tạo khóa mới.
- Bản này có giới hạn tần suất cơ bản theo IP, giới hạn kích thước nội dung/ảnh và một số security headers. Rate limit trong bộ nhớ không thay thế xác thực, HTTPS, giám sát chi phí, proxy đáng tin cậy hoặc rate limiting tại nền tảng triển khai.
- Bảng xếp hạng không phải bảng toàn cầu; hiện chỉ là thành tích cục bộ. Muốn nhiều người dùng và đồng bộ đa thiết bị cần backend, tài khoản, cơ sở dữ liệu và chống gian lận.
- AI lập kế hoạch cá nhân hóa cần backend; nút kế hoạch hiện tại tạo lịch mẫu cục bộ, không giả vờ gọi AI.
- Ảnh đề bài sẽ rời thiết bị khi bạn chủ động nhấn gửi và backend đã cấu hình. Hãy tránh tải lên ảnh chứa dữ liệu riêng tư.

## Kiểm tra
- Mở HTML độc lập để dùng các tính năng cục bộ.
- AI health check: nhấn “Kiểm tra kết nối” sau khi chạy backend.
- Nếu gặp lỗi provider/model, xác nhận `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` và khả năng vision của model trong tài liệu nhà cung cấp.
