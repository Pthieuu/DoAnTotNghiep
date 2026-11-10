# Mẫu Prompt Chuẩn Cho Dự Án Aizuchi.AI (AI Japanese Interview Trainer)

Tài liệu này cung cấp các mẫu prompt mẫu để làm việc với AI hiệu quả, **tiết kiệm tối đa token** bằng cách chỉ định rõ file cần đọc, tránh việc AI đọc toàn bộ dự án.

---

## 📌 Khung Cấu Trúc Prompt Tiêu Chuẩn

Mỗi prompt gửi cho AI nên tuân theo định dạng 5 phần:
```text
1. [Mục tiêu]: Mô tả ngắn gọn nhiệm vụ cần làm trong 1-2 câu.
2. [Files liên quan]: Danh sách chính xác các file cần đọc và chỉnh sửa (chỉ định file://).
3. [Component / Hàm mục tiêu]: Tên cụ thể của hàm, class hoặc component cần tác động.
4. [Kết quả mong muốn]: Output cụ thể, điều kiện hoàn thành, format dữ liệu mong đợi.
5. [Phạm vi KHÔNG được đụng tới]: Giới hạn các file, logic hoặc cấu trúc cấm chỉnh sửa.
```

---

## 📝 Mẫu 1: Sửa Bug Logic Nghiệp Vụ / Chấm Điểm (Bug Fix)

### Khung điền:
```text
Tôi cần sửa lỗi trong logic [tên tính năng].
- Files liên quan: [Đường dẫn file logic], [Đường dẫn file test]
- Hàm/Component: [Tên hàm hoặc component gây lỗi]
- Mô tả lỗi & Kết quả mong muốn: [Mô tả hiện tượng lỗi hiện tại và kết quả kỳ vọng sau khi fix]
- Phạm vi KHÔNG được đụng tới: [Các hằng số, schema database, file cấu hình cấm sửa]
- Kiểm tra lại bằng lệnh: [Lệnh chạy test hoặc typecheck]
```

### Ví dụ thật trong dự án:
```text
Tôi cần sửa lỗi tính điểm chuẩn hóa rubric khi tiêu chí bị thiếu dữ liệu.
- Files liên quan: src/lib/interview-rubric.ts, tests/interview-rubric.test.mjs
- Hàm/Component: parseRubric()
- Mô tả lỗi & Kết quả mong muốn: Khi tiêu chí C04 (Hiểu biết vai trò) hoặc C05 (Tiếng Nhật) có status là 'insufficient_data' hoặc null, totalScore phải được tính chuẩn hóa lại dựa trên tổng trọng số của các tiêu chí thực tế đã chấm (assessedCount), đồng thời đặt cờ provisional = true. Điểm không được phép ép về 0.
- Phạm vi KHÔNG được đụng tới: Trọng số WEIGHTS gốc (30/25/20/15/10), cấu trúc enum CRITERIA, các component UI trong src/components/rubric-details.tsx.
- Kiểm tra lại bằng lệnh: node --test tests/interview-rubric.test.mjs && npm run typecheck
```

---

## 📝 Mẫu 2: Thêm Tính Năng Mới Vào Luồng Phỏng Vấn (Feature Addition)

### Khung điền:
```text
Tôi muốn thêm tính năng mới: [Tên tính năng].
- Files liên quan: [Danh sách file backend/lib/route handler liên quan]
- Hàm/Component: [Tên hàm/component cần mở rộng]
- Kết quả mong muốn: [Quy tắc nghiệp vụ mới, điều kiện prompt, định dạng trả về]
- Phạm vi KHÔNG được đụng tới: [Các provider AI khác, logic chống hallucination, route không liên quan]
- Kiểm tra lại bằng lệnh: [Lệnh typecheck / test]
```

### Ví dụ thật trong dự án:
```text
Tôi muốn thêm tính năng: Hỗ trợ sinh câu hỏi về văn hóa công sở Nhật (Ho-Ren-So / Manner) cho ứng viên cấp độ N2/N1.
- Files liên quan: src/lib/interview-generation.ts, src/app/api/interviews/route.ts
- Hàm/Component: buildQuestionPrompt(), generateInterviewQuestions()
- Kết quả mong muốn: Khi jlptLevel là 'N1' hoặc 'N2', system prompt yêu cầu AI tạo ít nhất 1 câu hỏi tình huống về cách báo cáo/liên lạc (Ho-Ren-So) hoặc quy tắc ứng xử nơi làm việc Nhật Bản. Nếu câu hỏi liên quan đến trải nghiệm quá khứ, vẫn bắt buộc trích xuất quote_from_cv hợp lệ.
- Phạm vi KHÔNG được đụng tới: src/lib/ai-config.ts, cơ chế kết nối Ollama/OpenAI, validation chống lộ prompt (prompt leakage), bảng interview_sessions.
- Kiểm tra lại bằng lệnh: npm run typecheck && npm run lint
```

---

## 📝 Mẫu 3: Refactor / Tối Ưu Component Giao Diện (Refactoring)

### Khung điền:
```text
Tôi muốn refactor [Tên component/file] để [Mục đích: tăng tốc, tách module, dễ bảo trì].
- Files liên quan: [File component gốc], [File hook/component mới dự kiến tạo]
- Hàm/Component: [Tên component cần tách/tối ưu]
- Kết quả mong muốn: [Giảm số dòng code, tách state/animation ra custom hook, giữ nguyên giao diện]
- Phạm vi KHÔNG được đụng tới: [Props interface, các API route liên quan, asset tĩnh 3D]
- Kiểm tra lại bằng lệnh: [Lệnh build hoặc typecheck]
```

### Ví dụ thật trong dự án:
```text
Tôi muốn refactor VrmAvatar để tách logic điều khiển biểu cảm miệng (Lip Sync) và nháy mắt (Blink) ra custom hook riêng.
- Files liên quan: src/components/vrm-avatar.tsx, tạo mới src/hooks/useVrmAnimation.ts
- Hàm/Component: VrmAvatar
- Kết quả mong muốn: Tách toàn bộ logic cập nhật VRMExpressionManager (blend shapes 'blink', 'aa', 'ih', 'ou') vào hook useVrmAnimation. Component VrmAvatar chỉ quản lý Three.js Canvas, ánh sáng và nạp model. Giữ nguyên hiệu năng 60fps khi nói chuyện.
- Phạm vi KHÔNG được đụng tới: Đường dẫn model /models/Hiro.vrm, props của VrmAvatar ({ isSpeaking, audioLevel, isThinking }), logic kết nối WebSocket ở useGeminiLiveInterview.ts.
- Kiểm tra lại bằng lệnh: npm run typecheck && npm run build -- --webpack
```

---

## 📝 Mẫu 4: Viết Unit Test Tự Động (Unit Testing)

### Khung điền:
```text
Tôi cần viết bộ unit test kiểm thử logic cho [Tên module logic].
- Files liên quan: [File logic nguồn], [File test mới tại tests/]
- Hàm/Component: [Tên hàm cần test]
- Kết quả mong muốn: [Liệt kê các ca kiểm thử: ca thành công, ca lỗi, ca biên, ca dữ liệu rỗng]
- Phạm vi KHÔNG được đụng tới: [Không cài thêm thư viện test bên ngoài, chỉ dùng test runner tích hợp]
- Kiểm tra lại bằng lệnh: [Lệnh chạy test]
```

### Ví dụ thật trong dự án:
```text
Tôi cần viết bộ unit test cho module tổng kết điểm phiên phỏng vấn.
- Files liên quan: src/lib/interview-summary.ts, tạo file tests/interview-summary.test.mjs
- Hàm/Component: calculateSessionSummary(), evaluateGrade()
- Kết quả mong muốn: Viết test suite kiểm tra:
  1. Phiên đủ tất cả câu hỏi có điểm số rubric -> tính điểm trung bình chính xác và xếp loại.
  2. Phiên có câu trả lời bị bỏ qua (null score) -> không tính vào mẫu số.
  3. Phiên chỉ có điểm tạm tính (provisional) -> trả về trạng thái chưa xếp loại chính thức.
- Phạm vi KHÔNG được đụng tới: Chỉ sử dụng node:test và node:assert/strict của Node.js (KHÔNG cài thêm Jest, Vitest, Mocha). Không sửa logic bên trong src/lib/interview-summary.ts trừ khi phát hiện bug test.
- Kiểm tra lại bằng lệnh: node --test tests/interview-summary.test.mjs
```

---

## 📝 Mẫu 5: Cập Nhật Route Handler & Database API (Backend / Supabase)

### Khung điền:
```text
Tôi cần cập nhật API endpoint [Tên đường dẫn API] để hỗ trợ [Thao tác dữ liệu].
- Files liên quan: [File route.ts], [File migration hoặc lib DB]
- Hàm/Component: [Handler POST/GET/PATCH]
- Kết quả mong muốn: [Validate input, query Supabase với RLS, format JSON response chuẩn]
- Phạm vi KHÔNG được đụng tới: [Auth session middleware, service_role key, các route API khác]
- Kiểm tra lại bằng lệnh: [Lệnh kiểm tra kiểu và lint]
```

### Ví dụ thật trong dự án:
```text
Tôi cần cập nhật endpoint lưu câu trả lời phỏng vấn để nhận thêm trường thời lượng trả lời (duration_seconds).
- Files liên quan: src/app/api/interviews/[id]/answers/route.ts, src/lib/supabase/server.ts
- Hàm/Component: export async function POST(request, { params })
- Kết quả mong muốn:
  1. Đọc và validate trường duration_seconds từ body (phải là số nguyên >= 0).
  2. Lưu trường duration_seconds vào bảng interview_answers cùng với answer và question_index.
  3. Trả về câu hỏi tiếp theo hoặc thông báo hoàn thành nếu đã hết danh sách câu hỏi.
- Phạm vi KHÔNG được đụng tới: Middleware src/proxy.ts, hàm xác thực getUser(), không làm gián đoạn trường rubric_json hiện có.
- Kiểm tra lại bằng lệnh: npm run typecheck && npm run lint
```

---

## 📝 Mẫu 6: Nâng Cấp Giao Diện Báo Cáo & Rubric (UI / Dashboard)

### Khung điền:
```text
Tôi cần cải tiến giao diện [Tên màn hình/component].
- Files liên quan: [Component giao diện], [File CSS nếu có]
- Hàm/Component: [Tên component UI]
- Kết quả mong muốn: [Mô tả bố cục mới, styling Tailwind CSS, responsive, trải nghiệm người dùng]
- Phạm vi KHÔNG được đụng tới: [Logic tính điểm ở backend, cấu trúc dữ liệu trả về từ API]
- Kiểm tra lại bằng lệnh: [Lệnh build kiểm tra]
```

### Ví dụ thật trong dự án:
```text
Tôi cần cải tiến giao diện hiển thị cấu trúc PREP/STAR trong bảng đánh giá câu trả lời.
- Files liên quan: src/components/rubric-details.tsx, src/app/summary/client-page.tsx
- Hàm/Component: RubricDetails
- Kết quả mong muốn: Hiển thị 4 bước cấu trúc (Point, Reason, Example, Point) dạng checklist có biểu tượng tích xanh nếu đạt (present = true), dấu chấm than nếu thiếu, và quote bằng chứng (evidence) trong khung trích dẫn rõ nét bằng Tailwind CSS v4.
- Phạm vi KHÔNG được đụng tới: Logic parse trong src/lib/interview-rubric.ts, không đổi cấu trúc RubricResult.
- Kiểm tra lại bằng lệnh: npm run typecheck && npm run build -- --webpack
```

