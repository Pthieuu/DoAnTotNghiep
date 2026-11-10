<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AI Japanese Interview Trainer (Aizuchi.AI) - Hướng Dẫn Dự Án

## 1. Tổng quan & Tech Stack
Aizuchi.AI là ứng dụng web luyện phỏng vấn xin việc tiếng Nhật với AI interviewer mô phỏng qua Avatar 3D (VRM). Ứng dụng trích xuất CV ứng viên, sinh câu hỏi phỏng vấn chuẩn hóa bám sát kinh nghiệm thực tế (chống bịa đặt), hỗ trợ hội thoại hai chiều qua giọng nói (Gemini Live) và chấm điểm chi tiết theo rubric 5 tiêu chí (chuẩn PREP/STAR).
- **Frontend / Framework**: Next.js 16.3.6 (App Router), React 19.3.0, TypeScript ~6.0.3, Tailwind CSS 4.3.3.
- **Backend / DB / Auth**: Supabase SSR (`@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.2, PostgreSQL + RLS).
- **3D & Voice**: Three.js 0.180.0, `@pixiv/three-vrm` 3.5.5, Gemini Live API, Web Speech API.
- **AI Models**: Ollama (`qwen3:4b` local, mặc định) hoặc OpenAI (`gpt-4o-mini`) xử lý CV & sinh câu hỏi; Gemini Live tương tác giọng nói.

## 2. Cấu trúc thư mục quan trọng
- `src/app/`: Next.js App Router; các trang (dashboard, cv, interview-setup, interview-room, summary, login).
- `src/app/api/`: Route Handlers (auth, cv processing, interview sessions, answers, live token).
- `src/components/`: React components (`vrm-avatar.tsx`, `cv-workspace.tsx`, `interview-setup-form.tsx`, `dashboard-shell.tsx`).
- `src/hooks/`: Custom hooks quản lý audio và live streaming (`useGeminiLiveInterview.ts`, `useSpeechRecognition.ts`).
- `src/lib/`: Core logic nghiệp vụ (`interview-rubric.ts`, `interview-generation.ts`, `cv-processing.ts`, `interview-summary.ts`).
- `src/lib/supabase/`: Cấu hình Supabase client phía server và trình xử lý cookie auth (`server.ts`, `config.ts`).
- `src/proxy.ts`: Middleware xử lý session cookie và kiểm soát truy cập trang bảo vệ.
- `supabase/migrations/`: Các file SQL migration cơ sở dữ liệu sắp xếp theo thứ tự timestamp.
- `tests/`: Automated tests logic chấm điểm rubric (`interview-rubric.test.mjs`).
- `public/`: Assets tĩnh, ảnh nền và model 3D (`models/Hiro.vrm`).
- `docs/`: Tài liệu kiến trúc và hướng dẫn thiết lập (`interview-flow-plan.md`, `supabase-setup.md`).

## 3. Luồng hoạt động chính
1. **Auth & Profile**: Đăng ký/đăng nhập qua Supabase Auth (`/login`), quản lý tài khoản tại `/dashboard` và `/profile`.
2. **Xử lý CV**: Upload PDF/DOCX tại `/cv` -> `/api/cv` trích xuất thông tin qua Ollama/OpenAI -> ứng viên xác nhận lưu `confirmed_data`.
3. **Setup phỏng vấn**: Chọn Role, JD, JLPT (N5-N1), số câu hỏi tại `/interview-setup` -> backend sinh câu hỏi bám sát CV.
4. **Phòng phỏng vấn**: Tại `/interview-room`, avatar 3D hiển thị, kết nối Gemini Live hội thoại giọng nói hoặc trả lời text.
5. **Chấm điểm & Tổng kết**: Mỗi câu trả lời được chấm theo rubric C01–C05 lưu vào `interview_answers`. Kết thúc xem báo cáo tại `/summary`.

## 4. Quy ước code
- **Naming**: kebab-case cho tên file (`interview-rubric.ts`), PascalCase cho Component (`VrmAvatar`), camelCase cho hàm/biến.
- **Component**: Mặc định là Server Component. Chỉ dùng `'use client'` khi có tương tác DOM, state, hook âm thanh hoặc Three.js.
- **Bảo mật**: Chỉ `NEXT_PUBLIC_*` được phép public. API keys bí mật (`GEMINI_API_KEY`, `OPENAI_API_KEY`) tuyệt đối giữ ở server.
- **AI Prompting**: Chống hallucination nghiêm ngặt; câu hỏi kinh nghiệm bắt buộc kèm trích dẫn đối soát từ CV (`quote_from_cv`).
- **Scoring Rubric**: Trọng số C01-C05 là 30/25/20/15/10. Dữ liệu thiếu ghi nhận `null`/`insufficient_data`, cấm tự ý gán 0 điểm.

## 5. Lệnh thực thi
- Chạy dev: `npm run dev` (hoặc `npm run dev -- --webpack` nếu port Turbopack bị hạn chế)
- Build: `npm run build` (hoặc `npm run build -- --webpack`)
- Chạy production: `npm start`
- Typecheck: `npm run typecheck` (`tsc --noEmit`)
- Lint: `npm run lint` (`eslint .`)
- Test: `node --test tests/interview-rubric.test.mjs`

## 6. Thư mục & File KHÔNG CẦN ĐỌC (Tiết kiệm token)
- `node_modules/`, `.next/`, `out/`: Thư viện phụ thuộc và build artifacts sinh tự động.
- `package-lock.json`, `tsconfig.tsbuildinfo`: File lock và build cache kích thước lớn.
- `OllamaSetup.exe`, `public/models/Hiro.vrm`, `public/*.jpg`: File cài đặt nhị phân và asset đồ họa/3D.
- `interview_practice_requirements.md`: Bản PRD nháp cũ (thiết kế Python/Vite), không phản ánh kiến trúc code hiện tại.
- `init_database.sql`: File SQL tổng hợp cũ; schema thực tế theo dõi tại `supabase/migrations/`.

## 7. Lưu ý dễ sai & Bẫy thường gặp (Pitfalls)
- **Next.js 16 breaking change**: `params` và `searchParams` là Promise; luôn phải `await searchParams` trong page server component.
- **Turbopack port issue**: Một số môi trường Windows bị chặn port worker; cần chuyển sang `--webpack` khi build/dev.
- **Database Schema**: Bắt buộc áp dụng migration `202610120001_interview_scoring_rubric.sql` để có cột `rubric_json`.
- **CV Provider**: Mặc định dùng Ollama local (`http://127.0.0.1:11434`, model `qwen3:4b`). Chuyển sang OpenAI nếu dùng cloud API.
- **Client-only APIs**: Three.js (`VrmAvatar`) và Web Audio/Speech chỉ hoạt động trên trình duyệt, tránh import trực tiếp vào Server Component.
