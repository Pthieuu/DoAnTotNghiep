# AI Japanese Interview Trainer

Minimal Next.js foundation using the App Router, TypeScript, Tailwind CSS, and ESLint.

## Development

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

## Checks

```sh
npm run lint
npm run build
npm run typecheck
```

The build generates Next.js type declarations. Run it before checking types on a fresh checkout.

To serve the production build, run `npm start` after `npm run build`.

In the initialization environment, Turbopack's worker port was blocked. The production build was verified with `npm run build -- --webpack`. If your environment has the same restriction, use that command for builds and `npm run dev -- --webpack` for development.

## Initialization

This project was initialized manually in the repository root with these commands:

```sh
npm init -y
npm install next@latest react@latest react-dom@latest
npm install -D typescript@latest @types/node@latest @types/react@latest @types/react-dom@latest tailwindcss@latest @tailwindcss/postcss@latest postcss@latest eslint@9 eslint-config-next@latest
npm install -D eslint@latest
npm install -D typescript@~6.0.3 @types/node@^24
npm install -D eslint@9
```

The package scripts, TypeScript, ESLint, and PostCSS configuration, root layout, global CSS, and placeholder homepage were then created manually. Exact resolved dependency versions are recorded in `package-lock.json`.

TypeScript 6.0 and ESLint 9 satisfy the peer requirements of Next.js's lint tooling. npm marks ESLint 9 as deprecated; ESLint 10 was checked but is outside the peer ranges of several bundled plugins.

## Screens and authentication

- `/`: Aizuchi.AI landing page.
- `/login`: email/password sign-in and registration through Supabase Auth.
- `/dashboard`: protected workspace showing the authenticated name/email and interview sessions saved for that account in Supabase. New accounts see an empty state until sessions are stored.

See [Supabase setup](docs/supabase-setup.md) to create a project, configure `.env.local`, and enable confirmation emails. Auth endpoints use Next.js Route Handlers. Google/GitHub login and password recovery are not connected yet.

Apply the SQL migrations in `supabase/migrations/` in timestamp order in your Supabase SQL Editor. The interview flow requires `202609290001_create_interview_sessions.sql`, the CV migrations `202609300001_create_candidate_cvs.sql` and `202609300002_extend_candidate_cvs.sql`, `202609300003_extend_interview_sessions.sql`, and `202609300004_create_interview_answers.sql`. These add interview setup, private question storage, and per-question answers. The authenticated account needs a confirmed CV before it can create an interview.

Interview question generation uses the configured server-side AI provider. It treats JD skills as job requirements rather than claims about the candidate; questions about specific past experience need a matching quote from the confirmed CV, and leaked AI instructions are rejected. With the default `CV_AI_PROVIDER=ollama`, install and run Ollama, then pull the model configured in `OLLAMA_MODEL` (default `qwen3:4b`). Alternatively set `CV_AI_PROVIDER=openai`, provide a valid `OPENAI_API_KEY`, and optionally choose `OPENAI_INTERVIEW_MODEL` (defaults to `OPENAI_CV_MODEL`, then `gpt-4o-mini`). Restart Next.js after changing `.env.local`. These local Ollama requirements can differ across team members' machines; OpenAI requires API access and may incur usage charges. Do not commit `.env.local` or API keys.

The setup page creates interview questions but shows only a confirmation, not the question list. Choose **Bắt đầu luyện tập** to enter the Interview Room. The room uses Gemini Live for real-time spoken interviewer responses and adaptive follow-up questions. Add `GEMINI_API_KEY` to `.env.local`; the server issues a short-lived token for the browser and keeps the API key private. Start the microphone conversation, then stop and submit the candidate transcript to save and score the current planned question. The next planned question begins when you start the microphone again.

Without Supabase configuration, the login page shows setup instructions and protected pages redirect to login. The application can still be built without credentials.

### Chấm điểm theo checklist phỏng vấn (v1.1)

Bộ chấm trong `src/lib/interview-rubric.ts` dựa trên hai tài liệu
`Checklist_cham_diem.xlsx` và `Checklist_luyen_phong_van.docx` (12/10/2026).
Model trả mức 0–4, bằng chứng và lý do cho C01–C05, có trọng số lần lượt
30/25/20/15/10. Backend kiểm tra kết quả và tính điểm /100; cột điểm từng câu
hiện có vẫn lưu thang /10. PREP/STAR phải đủ bốn bước đúng thứ tự; lỗi thuần
cấu trúc chỉ ảnh hưởng C03. Phản hồi gồm tối đa hai điểm mạnh, hai điểm cần
cải thiện và một việc luyện lại, kể cả khi điểm cao.

**Trước khi chạy code mới**, áp dụng migration
`supabase/migrations/202610120001_interview_scoring_rubric.sql` vào Supabase
(ví dụ qua SQL Editor của đúng project). Migration chỉ thêm cột JSON nullable
`interview_answers.rubric_json`, không sửa dữ liệu cũ hoặc chính sách truy cập.
Chưa áp dụng migration thì các truy vấn mới sẽ báo lỗi thiếu cột. Không cần
thay đổi biến môi trường hoặc cài thêm dependency. Migration chưa được tự động
áp dụng vào database từ task này.

Kết quả cũ có `rubric_json = null` vẫn hiển thị theo định dạng cũ; tổng kết đã
lưu không bị tính lại. Phiên đang luyện có cả kết quả cũ và mới không tính điểm
chung vì khác phạm vi đánh giá. Muốn nhận kết quả hoàn toàn theo checklist,
hãy tạo phiên luyện mới.

Không áp dụng/chưa đủ dữ liệu không được đổi thành 0. Phiên tiếng Việt không
chấm C05; thiếu vị trí ứng tuyển không chấm C04. Chưa đủ năm tiêu chí thì hiển
thị điểm tạm tính và số tiêu chí đã chấm. Điểm tổng kết là trung bình các điểm
/100 chỉ khi cùng phạm vi tiêu chí; chưa đầy đủ thì không xếp loại. Điểm tạm tính
không ghi vào `interview_sessions.score`, do đó không lẫn vào biểu đồ/điểm trung
bình dashboard. Tác phong không cộng vào điểm nội dung. Bản chấm hiện dùng văn
bản, không đánh giá phát âm hoặc hành vi video và không dự đoán khả năng đậu.

Kiểm tra logic và mô phỏng bốn nhà cung cấp AI (không gọi API tính phí):

```sh
node --test tests/interview-rubric.test.mjs
npm run typecheck
npm run lint
```

Cần kiểm thử thêm một phiên thực tế tiếng Nhật và tiếng Việt sau khi áp dụng
migration, với provider đã cấu hình, để xác nhận chất lượng nhận xét và thời
gian phản hồi. Kiểm thử mô phỏng không thay thế đánh giá độ chính xác của model.

Ollama chấm từng câu dùng lời nhắc gọn tương đương checklist, giữ model trong
bộ nhớ 5 phút để giảm tải lại giữa các câu và chờ tối đa 120 giây. Route trả lời
cho phép 150 giây (nền tảng hosting vẫn có giới hạn riêng). Log
`Ollama evaluation timing` chỉ chứa thời gian tải/chạy và số token, không chứa
CV hay câu trả lời. Nếu model hết giới hạn token trước khi hoàn tất JSON,
hệ thống báo lỗi thay vì lưu điểm chưa hoàn chỉnh.
