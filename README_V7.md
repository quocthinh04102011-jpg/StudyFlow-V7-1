# StudyFlow V7 Neon

- `StudyFlow_V7.html`: chạy trực tiếp offline với các công cụ cục bộ.
- `index.html`: bản dùng trên máy chủ, giống file HTML độc lập.
- `server.mjs`: máy chủ Node.js 20+ cung cấp đăng ký, đăng nhập, điểm danh và BXH online thật.
- Chạy: `node server.mjs`, mở `http://localhost:8787`. Muốn nhiều người truy cập cần triển khai máy chủ HTTPS công khai.
- Tài khoản lưu ở `studyflow-users.json` trên máy chủ (tự tạo), mật khẩu scrypt + salt. KHÔNG tải tệp này lên kho mã công khai.
- Điểm online: điểm danh 10 điểm/ngày theo UTC, không lấy điểm cục bộ để tránh tự khai điểm. Đây là bảng xếp hạng dựa trên điểm danh, không phải xác minh thời gian học.
- Phiên đăng nhập giữ trong RAM máy chủ và sessionStorage của tab; khởi động lại máy chủ cần đăng nhập lại. Chưa có khôi phục mật khẩu/email.
- AI cần `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` trong môi trường máy chủ. Không cấu hình thì AI không hoạt động.
- Offline: dữ liệu trình duyệt cục bộ, không đồng bộ tự động với tài khoản. Sao lưu JSON thủ công.
- Bảng viết là công cụ riêng, truy cập từ menu Bảng viết & thử thách; chọn nhãn môn để phân loại bảng.
- Không dùng tài khoản thật trên HTTP công khai: triển khai HTTPS và quản lý sao lưu database, giới hạn lưu lượng trước khi phát hành rộng.
