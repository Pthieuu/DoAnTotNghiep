# Settings — giai đoạn 1–3

Chạy `supabase/migrations/202611170001_create_user_settings.sql` trong Supabase SQL Editor hoặc qua quy trình migration của dự án trước khi dùng API. Sau đó chạy `supabase/migrations/202611170002_user_settings_question_count.sql` để thêm số câu hỏi.

Mỗi tài khoản có tối đa một dòng, liên kết với `auth.users` và được xóa khi tài khoản bị xóa. RLS chỉ cho phép đọc/thêm/sửa dòng của chính mình. Timestamp do database quản lý. Không cần backfill: GET trả mặc định khi chưa có dòng, PATCH đầu tiên tạo dòng.

| Trường | Giá trị | Mặc định |
| --- | --- | --- |
| default_jlpt | N5, N4, N3, N2, N1 | N3 |
| interview_lang | ja, vi | ja |
| eval_framework | PREP, STAR | STAR |
| question_count | 4, 6, 8, 10 (số nguyên) | 6 |
| ai_voice | Kore, Aoede, Puck, Charon, Fenrir | Kore |

`GET /api/settings` trả `{ settings: UserSettings }`. `PATCH /api/settings` nhận một hoặc nhiều trường trong bảng và trả cùng cấu trúc. Các trường bỏ qua giữ nguyên; bản ghi mới dùng mặc định SQL. Không gửi `user_id` hoặc timestamp. PATCH yêu cầu JSON và Origin cùng nguồn, dùng session cookie hiện có. Response không được cache.

Lỗi trả `{ error: string }`: 400 dữ liệu sai, 401 chưa đăng nhập, 403 origin sai, 415 content type sai, 500 lỗi database, 503 dịch vụ/cấu hình/migration chưa sẵn sàng.

Client Component:

```ts
import { getUserSettings, updateUserSettings } from "@/lib/user-settings-client";

const settings = await getUserSettings();
await updateUserSettings({ default_jlpt: "N2" });
```

Server Component hoặc Server Action có thể gọi cùng tên hàm từ `@/lib/user-settings-server`. Các hàm server tự xác thực; không nhận ID người dùng từ caller. Client helpers ném Error khi thất bại để UI hiển thị thông báo và cho phép thử lại; UI cần dùng try/catch/finally để quản lý loading.

Trang `/settings` yêu cầu đăng nhập, có ba tab ngang và hỗ trợ phím mũi tên/Home/End. Tab Luyện tập & Phỏng vấn cho phép sửa JLPT, ngôn ngữ, PREP/STAR và số câu hỏi; có Skeleton, thử tải lại, trạng thái lưu/lỗi và hủy chỉnh sửa. Chuyển tab giữ bản nháp. Tab Phòng Live & Âm thanh được triển khai ở giai đoạn 3 bên dưới; tab Tài khoản vẫn là khung.

Giai đoạn này chỉ lưu tùy chọn, chưa thay đổi setup, giọng Gemini Live hoặc rubric chấm điểm. Việc áp dụng tùy chọn vào phiên phỏng vấn thuộc giai đoạn tiếp theo. Quyền micro thực tế phải đọc từ trình duyệt, không lưu như một quyền đã cấp trong database.

Kiểm tra tự động: `node --test tests/user-settings.test.mjs tests/settings-ui.test.mjs`.

Sau khi áp dụng migration, kiểm tra với hai tài khoản A/B: A tạo và sửa settings; B không thể đọc/sửa dòng A hoặc chèn dòng mang user_id của A. Kiểm tra PATCH từng trường giữ nguyên các giá trị còn lại, đăng xuất nhận 401. Các test Node dùng Supabase giả lập; chúng không thay thế kiểm tra RLS trên database thật.

## Giai đoạn 3 — Phòng Live & Âm thanh

Chạy tiếp migration `202611170003_user_settings_live_audio.sql` sau hai migration settings trước đó.

- `speech_voice_uri`: định danh giọng Web Speech, tối đa 512 ký tự; chuỗi rỗng chọn tự động một giọng tiếng Nhật.
- `speech_rate`: 0.5, 0.75, 1, 1.25 hoặc 1.5; mặc định 1.
- `live_transcript`, `vocabulary_hints`: boolean, mặc định true.
- `ai_voice` tiếp tục lưu giọng Gemini Live; không dùng tên giọng Gemini để giả lập giọng Web Speech.

Tab 2 có MicTester dùng enumerateDevices/getUserMedia và Web Audio để hiển thị mức âm thanh. Chỉ mở micro khi bấm thử; không ghi âm, tải âm thanh lên hoặc lưu deviceId vào tài khoản. Đổi thiết bị cần bấm thử lại. Khi chuyển tab/rời trang, stream, AudioContext, animation frame và giọng nghe thử được dừng; yêu cầu cấp quyền trả về muộn cũng được thu hồi stream.

Giọng tiếng Nhật được lấy từ speechSynthesis.getVoices và cập nhật qua voiceschanged. Nếu giọng đã lưu không có trên thiết bị, chọn lại giọng hoặc dùng tự động. Các switch hỗ trợ bàn phím theo button role=switch. Chuyển tab giữ bản nháp cài đặt.

Các tùy chọn Live được lưu nhưng chưa được áp dụng vào phiên Gemini Live hoặc giao diện phòng phỏng vấn trong giai đoạn này. Tốc độ điều khiển bản nghe thử Web Speech.

Kiểm tra: `node --test tests/user-settings.test.mjs tests/settings-ui.test.mjs tests/settings-audio.test.mjs`.

Kiểm tra thủ công trên HTTPS/localhost: cấp/từ chối quyền micro, hủy khi hộp thoại quyền còn mở, đổi/rút thiết bị, chuyển tab khi micro hoặc giọng đọc hoạt động; kiểm tra giọng tải muộn/không có giọng tiếng Nhật, nghe thử từng tốc độ, lưu và tải lại switch. Test tự động dùng API trình duyệt giả lập, không xác nhận chất lượng âm thanh hoặc quyền thiết bị thực tế.

## Giai đoạn 4 — Tài khoản & Vùng nguy hiểm

Chạy migration `202611170004_user_settings_account.sql` sau các migration trước. Tab 3 hiển thị email/tên từ phiên xác thực và lưu `email_reminders` (mặc định false), `reminder_frequency` (daily/weekly, mặc định weekly). Đây là cấu hình đăng ký nhận nhắc nhở; chưa có scheduler/provider gửi email định kỳ.

Thanh lưu cố định áp dụng cho tab đang mở; mỗi tab giữ bản nháp riêng và chỉ lưu những trường đã thay đổi của tab đó. Toast thành công tự đóng sau 5 giây và có nút đóng.

Danger Zone gọi `DELETE /api/settings/data` với `{ target: "history" | "cvs", confirmation: "XÓA" }`. Endpoint yêu cầu cùng origin, JSON và phiên đăng nhập; không nhận user_id. Modal dùng dialog native, mặc định focus nút Hủy và chặn đóng khi đang xóa.

Xóa history dùng RPC security invoker/RLS, gỡ liên kết source_session_id trong cùng transaction rồi xóa phiên; câu trả lời được cascade. Bao gồm cả phiên đang diễn ra, báo cáo và luyện điểm yếu. Xóa CV theo batch 100: xóa tệp Storage trước rồi metadata theo ID/owner. Nếu lỗi có thể đã xóa một phần; UI báo lỗi và cho phép thử lại. CV snapshots trong lịch sử và bản nháp trình duyệt không thuộc phạm vi xóa CV, được ghi rõ trong modal. Không xóa tài khoản hoặc hồ sơ candidate_profiles.

Kiểm tra bổ sung: `node --test tests/settings-account.test.mjs`. Trên Supabase thử với hai tài khoản, lịch sử có phiên luyện điểm yếu và CV có/không có tệp. Kiểm tra RLS, cascade, lỗi Storage, retry và xác nhận đúng phạm vi trước khi dùng production. Chưa thực hiện xóa dữ liệu thật trong quá trình triển khai.
