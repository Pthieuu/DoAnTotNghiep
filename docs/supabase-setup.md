# Cấu hình Supabase Auth

Ứng dụng dùng Next.js Route Handlers và Supabase Auth. Không cần tạo bảng riêng cho bước đăng nhập. Tên hiển thị được lưu trong `user_metadata.full_name`; mật khẩu do Supabase quản lý.

## 1. Tạo project

1. Đăng nhập https://supabase.com/dashboard và chọn **New project**.
2. Chọn organization, đặt tên project, đặt database password và chọn region phù hợp.
3. Khi project sẵn sàng, mở **Connect** để lấy Project URL và publishable key. Project cũ có thể dùng anon key.
4. Không dùng database password hoặc secret/service_role key trong cấu hình dưới đây.

## 2. Cấu hình local

Sao chép `.env.example` thành `.env.local` và điền:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Khởi động lại `npm run dev` sau khi thay đổi file. `.env.local` được Git bỏ qua.

## 3. Cấu hình email

Trong Supabase Authentication:

- Bật provider **Email** và cho phép đăng ký tài khoản.
- Giữ **Confirm email** bật để xác nhận địa chỉ email.
- Trong **URL Configuration**, đặt **Site URL** là `http://localhost:3000` và thêm `http://localhost:3000/auth/confirm` vào Redirect URLs.
- Trong **Email Templates → Confirm signup**, thay liên kết xác nhận bằng:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

Khi triển khai, thay Site URL bằng domain HTTPS thật và bổ sung redirect URL tương ứng. Cấu hình custom SMTP để gửi email cho người dùng ngoài giới hạn dịch vụ email thử nghiệm của Supabase.

## 4. Chạy thử

1. Mở `/login` → **Create an Account**.
2. Nhập tên, email nhận được thư và mật khẩu ít nhất 12 ký tự.
3. Mở email xác nhận. Link sẽ xác nhận tài khoản và đưa về `/dashboard`.
4. Dashboard hiển thị tên/email của bạn. Thống kê và lịch sử phỏng vấn lấy từ bảng `interview_sessions` theo đúng tài khoản; tài khoản mới sẽ thấy trạng thái trống.
5. Nhấn biểu tượng **Sign out** ở cuối sidebar, rồi đăng nhập lại bằng email/mật khẩu.
6. Thử mật khẩu sai, tải lại dashboard, truy cập dashboard sau đăng xuất, và link xác nhận hết hạn.

Nếu tắt Confirm email để thử local, đăng ký thành công sẽ vào dashboard ngay. Google/GitHub, quên mật khẩu và đổi ngôn ngữ chưa được kết nối.

## Backend

- `POST /api/auth/signup`: tạo tài khoản và gửi email xác nhận.
- `POST /api/auth/login`: xác thực email/mật khẩu.
- `POST /api/auth/logout`: đăng xuất phiên hiện tại.
- `GET /auth/confirm`: xác nhận token email.
- `src/proxy.ts`: làm mới cookie phiên trước khi render `/login`, `/dashboard` và `/profile`.
- `GET /api/profile`, `PUT /api/profile`: tải và lưu hồ sơ của tài khoản đang đăng nhập.
- Dashboard gọi `auth.getUser()` trên server để xác thực và chỉ truyền tên/email/id xuống giao diện.

Các POST chỉ chấp nhận Origin trùng với origin ứng dụng. Nếu chạy sau reverse proxy, cấu hình proxy giữ đúng host/protocol của request. Cookie phiên là HttpOnly, SameSite=Lax, Secure trong production. Không lưu token trong localStorage. Supabase cung cấp giới hạn tần suất Auth; cấu hình thêm CAPTCHA/rate limits trong Supabase trước khi mở đăng ký công khai.

Không cần service role key. Để bật lưu hồ sơ, chạy các migration `202609290002_create_candidate_profiles.sql` và `202609290003_expand_candidate_profile.sql` trong Supabase SQL Editor theo thứ tự. Migration thứ ba bổ sung lĩnh vực quan tâm, ngôn ngữ, học vấn/kinh nghiệm và kỹ năng công nghệ. Bảng hồ sơ bật RLS và giới hạn mọi thao tác theo `auth.uid()`.

## My CV: file, AI và OCR

1. Cài dependencies bằng `npm install` (hoặc `npm ci` sau khi lockfile đã cập nhật).
2. Chạy `supabase/migrations/202609300001_create_candidate_cvs.sql` trong SQL Editor. Migration tạo bảng có RLS và bucket riêng tư giới hạn 15 MB; file được lưu trong thư mục UUID của tài khoản.
3. Cài [Ollama](https://ollama.com/download), mở ứng dụng Ollama, rồi tải model chạy local:

```sh
ollama run qwen3:8b
```

Model tải khoảng 5 GB và cần tài nguyên máy tương ứng. Request CV chạy tại máy local, không gửi tới OpenAI và không tính phí API; đổi lại tốc độ phụ thuộc phần cứng. Ollama cung cấp API local và hỗ trợ đầu ra theo JSON Schema.

4. Thêm vào `.env.local`:

```dotenv
CV_AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
# Chỉ cần khi xử lý PDF scan; có thể để trống nếu chỉ dùng PDF có text/DOCX.
GOOGLE_CLOUD_VISION_API_KEY=...
```

Sau đó khởi động lại Next.js. Không cần `OPENAI_API_KEY` khi dùng Ollama. Nếu muốn dùng OpenAI API trả phí, đổi `CV_AI_PROVIDER=openai` và cấu hình `OPENAI_API_KEY` cùng `OPENAI_CV_MODEL`.

Khóa dịch vụ chỉ được đọc trong Route Handler phía máy chủ. PDF có text được trích xuất bằng `pdf-parse`, DOCX bằng `mammoth`; PDF scan gửi OCR qua Google Cloud Vision. Thiếu cấu hình provider hoặc OCR key cần thiết sẽ tạo trạng thái lỗi có lý do, không báo thành công giả. Upload mới không xóa bản đã dùng trước đó cho đến khi trích xuất thành công. Tệp/Dữ liệu được phục vụ theo tài khoản đã đăng nhập và link tải có thời hạn 5 phút.

`POST /api/cv`, `GET/PUT/DELETE /api/cv` và `POST /api/cv/[id]/process` là API CV. Dữ liệu AI, bản đã xác nhận và ghi chú được lưu riêng; My Profile không bị sửa. Hiện chưa có API tạo buổi phỏng vấn/câu hỏi để gắn CV vào lịch sử phỏng vấn.

## Dữ liệu dashboard

Chạy migration `supabase/migrations/202609290001_create_interview_sessions.sql` trong Supabase SQL Editor. Migration tạo bảng buổi phỏng vấn và bật Row Level Security để tài khoản chỉ đọc/sửa dữ liệu có `user_id` bằng `auth.uid()`.

Dashboard tính số buổi hoàn tất và điểm trung bình từ các hàng có `status = 'completed'` cùng `score`. Các buổi chưa hoàn tất được liệt kê nhưng không tính vào KPI. Hiện ứng dụng chưa có tính năng tạo/lưu buổi phỏng vấn; bảng chỉ bắt đầu có dữ liệu khi chức năng đó hoặc một API ghi dữ liệu được bổ sung. Không nhập lại các số liệu demo cũ như thể đó là kết quả thật.

Tài liệu chính thức:
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs
