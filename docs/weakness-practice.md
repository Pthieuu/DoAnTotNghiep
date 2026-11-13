# Module Luyện Tập Điểm Yếu (Weakness Practice)

## 1. Tổng quan
Tính năng **Weakness Practice** giúp người dùng xem lại các tiêu chí phỏng vấn đạt kết quả thấp (mức 0–2/4 theo rubric chuẩn C01–C05) từ buổi phỏng vấn gần nhất, chủ động lựa chọn các tiêu chí muốn cải thiện và bắt đầu phiên luyện tập tập trung gồm 4 câu hỏi.

## 2. Luồng hoạt động (User Flow)
```
Dashboard (Recommended Practice)
  ├── Đề xuất các tiêu chí C01–C05 điểm 0–2/4 từ phiên hoàn thành gần nhất
  └── Bấm "Luyện: [Tên tiêu chí]"
        ↓
Weakness Practice Panel
  ├── Chọn sẵn tiêu chí đã bấm
  ├── Cho phép tick/bỏ tick các tiêu chí mong muốn
  └── Bấm "Bắt đầu luyện tập" (Idempotency Key chống trùng phiên)
        ↓
Interview Room (/interview-room?sessionId=...)
  ├── Hiển thị banner mục tiêu tiêu chí luyện tập
  └── Trả lời 4 câu hỏi tập trung vào điểm yếu
        ↓
Summary Report (/summary?sessionId=...)
  ├── Chấm điểm đầy đủ 5 tiêu chí rubric chuẩn
  ├── So sánh mức điểm trước / sau phiên luyện tập (Delta)
  └── Nút "Luyện tiếp" hoặc liên kết quay về phiên nguồn
```

## 3. Kiến trúc mã nguồn

### Giao diện & Component
- `src/components/dashboard-practice.tsx`: Thẻ gợi ý luyện tập trên Dashboard, số lượng View All thực tế, nút mở panel.
- `src/components/weakness-practice-panel.tsx`: Panel chọn tiêu chí với checkbox, xử lý loading, error, retry và gọi API tạo phiên.
- `src/components/weakness-practice-goals.tsx`: Huy hiệu và danh sách mục tiêu tiêu chí trong phòng phỏng vấn.
- `src/components/weakness-practice-progress.tsx`: Bảng đối chiếu điểm trước/sau của các tiêu chí mục tiêu trong màn hình tổng kết.

### Nghiệp vụ & Xử lý logic
- `src/lib/dashboard-practice.ts`: Hàm `loadDashboardPractice` lọc phiên `completed` gần nhất của đúng `user.id`, trích xuất tiêu chí mức 0–2/4 có dẫn chứng hợp lệ.
- `src/lib/weakness-practice.ts`: Phân tích điểm yếu từ `rubric_json`, gom nhóm các tiêu chí C01–C05.
- `src/lib/weakness-practice-generation.ts`: Sinh đúng 4 câu hỏi luyện tập dựa trên CV/JD và câu trả lời yếu của phiên nguồn.
- `src/lib/weakness-practice-progress.ts`: So sánh mức điểm trước và sau giữa phiên nguồn và phiên luyện tập.

### API Handlers
- `GET /api/interviews/[id]/weaknesses`: Lấy danh sách điểm yếu C01–C05 của phiên nguồn.
- `POST /api/interviews/[id]/practice`: Tạo phiên luyện tập mới với cơ chế `idempotencyKey`.
- `POST /api/interviews/[id]/summary`: Tính toán và lưu `practice_progress` khi hoàn thành phiên luyện tập.

## 4. Hướng dẫn Migration Database
Trước khi chạy phiên luyện tập, đảm bảo đã áp dụng các migration sau vào cơ sở dữ liệu Supabase:
1. `supabase/migrations/202611100001_weakness_practice_sessions.sql`: Bổ sung các cột `source_session_id`, `selected_criteria` vào bảng `interview_sessions`.
2. `supabase/migrations/202611100002_weakness_practice_idempotency.sql`: Tạo bảng `interview_practice_idempotency` lưu khóa idempotency chống tạo phiên trùng lặp.

## 5. Bằng chứng kiểm thử (Automated Tests)
Chạy bộ kiểm thử tự động với lệnh:
```bash
node --test tests/dashboard-practice.test.mjs tests/weakness-practice*.test.mjs
```
Kết quả: **76/76 tests passed (100%)**.
Kiểm tra kiểu dữ liệu:
```bash
npm run typecheck
```
Kết quả: **0 lỗi TypeScript (Exit code 0)**.

