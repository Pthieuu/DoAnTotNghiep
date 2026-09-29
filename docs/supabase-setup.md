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
- `src/proxy.ts`: làm mới cookie phiên trước khi render `/login` và `/dashboard`.
- Dashboard gọi `auth.getUser()` trên server để xác thực và chỉ truyền tên/email/id xuống giao diện.

Các POST chỉ chấp nhận Origin trùng với origin ứng dụng. Nếu chạy sau reverse proxy, cấu hình proxy giữ đúng host/protocol của request. Cookie phiên là HttpOnly, SameSite=Lax, Secure trong production. Không lưu token trong localStorage. Supabase cung cấp giới hạn tần suất Auth; cấu hình thêm CAPTCHA/rate limits trong Supabase trước khi mở đăng ký công khai.

Không cần service role key hoặc SQL migration cho luồng này. Khi thêm bảng CV/lịch sử cá nhân, cần RLS gắn với `auth.uid()`.

## Dữ liệu dashboard

Chạy migration `supabase/migrations/202609290001_create_interview_sessions.sql` trong Supabase SQL Editor. Migration tạo bảng buổi phỏng vấn và bật Row Level Security để tài khoản chỉ đọc/sửa dữ liệu có `user_id` bằng `auth.uid()`.

Dashboard tính số buổi hoàn tất và điểm trung bình từ các hàng có `status = 'completed'` cùng `score`. Các buổi chưa hoàn tất được liệt kê nhưng không tính vào KPI. Hiện ứng dụng chưa có tính năng tạo/lưu buổi phỏng vấn; bảng chỉ bắt đầu có dữ liệu khi chức năng đó hoặc một API ghi dữ liệu được bổ sung. Không nhập lại các số liệu demo cũ như thể đó là kết quả thật.

Tài liệu chính thức:
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs
