# Truy vấn Dashboard

`loadDashboardData` không tải toàn bộ lịch sử phỏng vấn để phân trang.

- Lịch sử: lấy 5 dòng bằng `range`, thứ tự `completed_at DESC NULLS LAST, id DESC`.
- Tổng số phiên: truy vấn `count: exact, head: true` có lọc `user_id`.
- Thống kê: lấy tối đa 20 phiên hoàn thành gần nhất. `count: exact` trên truy vấn này cung cấp tổng số phiên hoàn thành trước khi áp dụng giới hạn.
- Rubric: chỉ lấy câu trả lời của 20 phiên trên, tối đa 300 dòng theo giới hạn 15 câu mỗi phiên hiện tại.
- Ngữ cảnh gần nhất: truy vấn riêng 1 phiên theo `created_at DESC, id DESC`, không phụ thuộc trang lịch sử đang mở.
- Profile và CV vẫn được truy vấn riêng theo người dùng.

Các truy vấn độc lập chạy song song. Lượt đầu lấy nguồn dữ liệu, số lượng và danh sách phiên; lượt sau lấy trang lịch sử và rubric. Recommended Practice giữ luồng truy vấn riêng.

Ở JavaScript, câu trả lời được gom theo `session_id` một lần. Mỗi rubric hợp lệ được kiểm tra một lần; kết quả đã kiểm tra được dùng chung cho Skill Breakdown và xác định phạm vi so sánh điểm. Dữ liệu trùng, sai phiên bản, thiếu bằng chứng và điểm tạm tính vẫn bị loại theo quy tắc hiện tại.

## Chỉ mục

Migration `202611120001_dashboard_query_indexes.sql` bổ sung chỉ mục cho phiên hoàn thành gần nhất và phiên mới tạo của từng người dùng. Truy vấn lịch sử sử dụng chỉ mục `interview_sessions_user_completed_idx` hiện có. Migration không sửa dữ liệu hoặc chính sách RLS; chưa áp dụng migration thì ứng dụng vẫn hoạt động.

## Khi cần thống kê dài hạn

Nếu mở rộng thống kê ra toàn bộ lịch sử, nên đo bằng `EXPLAIN ANALYZE`, số dòng trả về và thời gian phản hồi trên dữ liệu đại diện trước khi chọn View, RPC hoặc bảng aggregate. View thông thường không tự lưu sẵn kết quả tính toán. Bảng aggregate hoặc materialized view cần cơ chế cập nhật khi thêm/sửa/xóa câu trả lời, kết thúc phiên và thay đổi phiên bản rubric.

Bất kỳ cách tổng hợp nào cũng phải bảo toàn quyền truy cập theo người dùng và quy tắc phân biệt dữ liệu thiếu với điểm 0, loại điểm tạm tính, tách phiên khác phạm vi đánh giá. Hiện chưa đo TTFB hoặc kế hoạch thực thi trên Supabase thật.
