# 📋 PRD — AI Interview Practice (Luyện Phỏng Vấn với AI)

## 1. Tổng quan dự án

Xây dựng một ứng dụng web **luyện phỏng vấn xin việc với AI**, trong đó người dùng upload CV dạng PDF và được phỏng vấn bởi một **AI Interviewer** có Avatar 3D biết nói chuyện (lip sync + animation). AI sẽ đọc CV, đặt câu hỏi phù hợp (technical + behavioral), đánh giá câu trả lời của người dùng và tổng kết điểm số cuối buổi.

---

## 2. Tech Stack (tái sử dụng từ dự án hiện có)

### Backend (Python)
- **Framework**: FastAPI + uvicorn
- **Package manager**: `uv`
- **LLM**: Gemini 2.5 Flash (`langchain-google-genai`)
- **Orchestration**: LangChain (`create_agent` hoặc `ChatPromptTemplate` + chain)
- **PDF parsing**: `pdfplumber`
- **Database/Auth/Storage**: Supabase (`supabase-py`)
  - **Supabase Auth**: Đăng ký / đăng nhập bằng email+password, JWT tự động
  - **Supabase Storage**: Bucket `cv-uploads` lưu file PDF
  - **Supabase DB** (PostgreSQL): Lưu sessions + lịch sử phỏng vấn
- **Env**: `python-dotenv`, file `.env`
- **Rate limiting**: Tự viết `_RateLimiter` class (pattern giống RAG_BOT hiện có)
- **CORS**: `fastapi.middleware.cors.CORSMiddleware` cho phép frontend localhost

### Frontend (React)
- **Framework**: React + Vite (giống `history_assistant`)
- **3D Avatar**: `@react-three/fiber` + `@react-three/drei` + `three.js`
  - Model: file `.glb` (ReadyPlayerMe hoặc tương tự)
  - Animation FBX: Idle, Talking, Thinking, Greeting
  - Lip Sync: Web Speech API + viseme mapping (pattern giống `Avatar.jsx` hiện có)
  - Tái sử dụng: `lipsync.js`, `useSpeechRecognition.js`, `useSpeechSynthesis.js` từ dự án cũ
- **Voice Input**: Web Speech API (`SpeechRecognition`) — hook `useSpeechRecognition` đã có sẵn
- **Auth client**: `@supabase/supabase-js` — xử lý login/logout/session JWT ở frontend
- **HTTP client**: `axios`
- **Router**: `react-router-dom`
- **UI components**: MUI hoặc thuần CSS tùy chọn

---

## 3. Luồng hoạt động chính (User Flow)

```
[1] Upload CV (PDF)
        │
        ▼
[2] Chọn loại phỏng vấn: Technical / Behavioral / Mixed
        │
        ▼
[3] Chọn số lượng câu hỏi (5 / 10 / 15)
        │
        ▼
[4] Bắt đầu phỏng vấn:
    ├── Avatar 3D xuất hiện, chào hỏi
    ├── AI đọc CV → đặt câu hỏi đầu tiên
    ├── Avatar đọc câu hỏi to (TTS + lip sync)
    ├── User trả lời bằng text hoặc voice (mic)
    ├── AI đánh giá câu trả lời → đặt câu hỏi tiếp theo
    └── Lặp lại đến hết số câu
        │
        ▼
[5] Màn hình tổng kết:
    ├── Điểm tổng (0–100)
    ├── Nhận xét từng câu
    ├── Điểm mạnh / điểm yếu
    └── Gợi ý cải thiện
```

---

## 4. Kiến trúc hệ thống

```
┌──────────────────────────────────────────────┐
│              Frontend (React + Vite)          │
│                                              │
│  [LoginPage] → [UploadPage] → [SetupPage]    │
│             → [InterviewPage] → [SummaryPage]│
│                                              │
│  @supabase/supabase-js (Auth + Storage)      │
│  Avatar3D (R3F) + Lip Sync + SpeechRecog     │
└───────────────────────┬──────────────────────┘
                        │ HTTP / axios + JWT header
                        ▼
┌──────────────────────────────────────────────┐
│              Backend (FastAPI)               │
│                                              │
│  POST /upload-cv      → PDF lên Supabase Storage
│  POST /start-session  → tạo session row trong DB
│  POST /next-question  → AI hỏi câu tiếp theo │
│  POST /evaluate       → AI chấm + lưu DB     │
│  POST /summary        → AI tổng kết + lưu DB │
│  GET  /history        → lịch sử các buổi     │
└───────────────────────┬──────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
   Gemini 2.5 Flash  Supabase DB   Supabase Storage
   (LangChain chain) (PostgreSQL)  (bucket cv-uploads)
                     sessions +
                     interview_logs
```

---

## 5. Backend — API Endpoints chi tiết

### `POST /upload-cv`
- **Auth**: Yêu cầu JWT token từ Supabase Auth trong header `Authorization: Bearer <token>`
- **Input**: `multipart/form-data` — file PDF
- **Xử lý**:
  1. Verify JWT → lấy `user_id` từ Supabase Auth
  2. Upload file PDF lên **Supabase Storage** bucket `cv-uploads` (path: `{user_id}/{uuid}.pdf`)
  3. Đọc nội dung PDF bằng `pdfplumber` → extract text
  4. Tạo `session_id` (UUID)
  5. Insert row vào bảng `interview_sessions` trong Supabase DB
- **Output**:
  ```json
  {
    "session_id": "uuid-xxxx",
    "cv_file_url": "https://xxx.supabase.co/storage/v1/object/...",
    "cv_summary": "Nguyễn Văn A, 3 năm kinh nghiệm React..."
  }
  ```

### `POST /start-session`
- **Input**:
  ```json
  {
    "session_id": "uuid-xxxx",
    "interview_type": "mixed",
    "total_questions": 10
  }
  ```
- **Xử lý**:
  - AI đọc toàn bộ CV text
  - Lên kế hoạch: tạo danh sách câu hỏi dự kiến (không trả về user, chỉ lưu nội bộ)
  - Tạo lời chào mở đầu
- **Output**:
  ```json
  {
    "greeting": "Xin chào! Tôi là AI Interviewer. Tôi đã đọc CV của bạn...",
    "total_questions": 10
  }
  ```

### `POST /next-question`
- **Input**:
  ```json
  {
    "session_id": "uuid-xxxx",
    "question_index": 0
  }
  ```
- **Xử lý**:
  - Dựa vào CV + lịch sử hội thoại → sinh câu hỏi tiếp theo
  - Câu hỏi phải liên quan đến thông tin có trong CV
  - Xen kẽ technical và behavioral theo tỉ lệ hợp lý
- **Output**:
  ```json
  {
    "question": "Bạn có đề cập đến dự án X trong CV, bạn có thể mô tả kiến trúc của dự án đó không?",
    "question_type": "technical",
    "question_index": 1
  }
  ```

### `POST /evaluate`
- **Auth**: Yêu cầu JWT token
- **Input**:
  ```json
  {
    "session_id": "uuid-xxxx",
    "question": "...",
    "question_type": "technical",
    "user_answer": "Câu trả lời của user..."
  }
  ```
- **Xử lý**:
  - AI chấm điểm câu trả lời (0–10)
  - Nhận xét ngắn gọn (tốt/chưa tốt ở điểm nào)
  - Gợi ý câu trả lời tốt hơn (nếu dưới 7 điểm)
  - Insert row vào bảng `interview_logs` trong Supabase DB
- **Output**:
  ```json
  {
    "score": 7,
    "feedback": "Câu trả lời của bạn đề cập đúng hướng, nhưng còn thiếu phần giải thích về...",
    "suggestion": "Bạn có thể bổ sung thêm...",
    "is_last_question": false
  }
  ```

### `POST /summary`
- **Auth**: Yêu cầu JWT token
- **Input**:
  ```json
  { "session_id": "uuid-xxxx" }
  ```
- **Xử lý**:
  - Tổng hợp toàn bộ lịch sử câu hỏi + đánh giá
  - Tính điểm trung bình
  - Phân tích điểm mạnh / điểm yếu tổng thể
- **Output**:
  ```json
  {
    "total_score": 72,
    "grade": "B",
    "strengths": ["Giải thích rõ ràng", "Có kinh nghiệm thực tế"],
    "weaknesses": ["Thiếu ví dụ cụ thể về...", "Chưa đề cập đến..."],
    "improvement_tips": ["Nên luyện STAR method", "Đọc thêm về system design"],
    "question_details": [
      {
        "question": "...",
        "user_answer": "...",
        "score": 8,
        "feedback": "..."
      }
    ]
  }
  ```

### `GET /history`
- **Auth**: Yêu cầu JWT token
- **Xử lý**: Query Supabase DB lấy tất cả sessions của `user_id`
- **Output**:
  ```json
  [
    {
      "session_id": "uuid-xxxx",
      "created_at": "2026-10-05T10:00:00",
      "interview_type": "mixed",
      "total_questions": 10,
      "total_score": 72,
      "grade": "B"
    }
  ]
  ```

---

## 6. Backend — AI Prompt Design

### System Prompt (dùng cho toàn bộ session)

```
Bạn là một AI Interviewer chuyên nghiệp, đang phỏng vấn ứng viên dựa trên CV của họ.

THÔNG TIN CV:
{cv_text}

LOẠI PHỎNG VẤN: {interview_type}
- "technical": Chỉ hỏi câu hỏi kỹ thuật liên quan đến kỹ năng, công nghệ, dự án trong CV.
- "behavioral": Chỉ hỏi câu hỏi về kinh nghiệm, cách xử lý tình huống, làm việc nhóm.
- "mixed": Xen kẽ 60% technical, 40% behavioral.

QUY TẮC ĐẶT CÂU HỎI:
1. Câu hỏi PHẢI dựa trên thông tin có trong CV (kỹ năng, dự án, kinh nghiệm).
2. Đặt câu hỏi theo thứ tự từ dễ đến khó.
3. Không hỏi lại câu đã hỏi.
4. Câu hỏi behavioral phải dùng format STAR gợi ý (Situation, Task, Action, Result).
5. Mỗi câu hỏi ngắn gọn, rõ ràng, không quá 3 câu.

QUY TẮC CHẤM ĐIỂM:
- Chấm điểm 0–10 dựa trên: độ chính xác, độ sâu, ví dụ cụ thể, cấu trúc câu trả lời.
- Phản hồi mang tính xây dựng, không chỉ trích gay gắt.
- Nếu câu trả lời dưới 7/10, bắt buộc phải đưa ra gợi ý cải thiện.

NGÔN NGỮ: Trả lời bằng tiếng Việt, thân thiện và chuyên nghiệp.
```

---

## 7. Frontend — Cấu trúc trang

### Trang 0: `/login` — Đăng nhập / Đăng ký
- Form email + password
- Dùng `@supabase/supabase-js` gọi `supabase.auth.signInWithPassword()` / `signUp()`
- Sau login thành công → redirect về `/`
- Lưu session JWT vào Supabase client (tự động)

### Trang 1: `/` — Upload CV
- **Guard**: Redirect về `/login` nếu chưa đăng nhập
- Giao diện drag & drop upload PDF
- Upload file lên **Supabase Storage** qua `supabase.storage.from('cv-uploads').upload()`
- Gọi `POST /upload-cv` để parse PDF
- Preview tên file + tóm tắt CV nhận được
- Button "Bắt đầu thiết lập"

### Trang 2: `/setup` — Cấu hình phỏng vấn
- Chọn loại phỏng vấn: Technical / Behavioral / Mixed (3 card lớn)
- Chọn số câu hỏi: 5 / 10 / 15 (radio button hoặc slider)
- Hiển thị tóm tắt CV đã nhận diện được (tên, kỹ năng chính, kinh nghiệm)
- Button "Bắt đầu phỏng vấn"

### Trang 3: `/interview` — Phỏng vấn chính (**quan trọng nhất**)
- **Bên trái (2/3 màn hình)**: Avatar 3D (`@react-three/fiber`)
  - Animations: Idle (khi chờ), Talking (khi đọc câu hỏi), Thinking (khi xử lý)
  - Lip sync đồng bộ khi Avatar đọc câu hỏi (Web Speech API)
  - Hiển thị câu hỏi dạng subtitle bên dưới Avatar
- **Bên phải (1/3 màn hình)**: Panel tương tác
  - Thanh tiến trình: "Câu 3/10"
  - Box hiển thị câu hỏi hiện tại
  - Ô textarea để user gõ câu trả lời
  - Nút mic để thu âm giọng nói (SpeechRecognition → convert sang text)
  - Button "Gửi câu trả lời"
  - Sau khi gửi: hiển thị feedback từ AI (điểm + nhận xét)
  - Button "Câu tiếp theo"

### Trang 4: `/summary` — Tổng kết
- Dữ liệu lấy từ Supabase DB (đã lưu ở bước evaluate + summary)
- Điểm tổng lớn (animated counter từ 0 lên điểm thực)
- Xếp loại: A / B / C / D kèm icon
- 2 cột: Điểm mạnh và Điểm yếu
- Danh sách chi tiết từng câu hỏi (có thể collapse/expand)
- Button "Luyện lại" → quay về trang 1
- Button "Xem lịch sử" → trang `/history`
- Button "Tải báo cáo" (tùy chọn, export PDF kết quả)

### Trang 5: `/history` — Lịch sử phỏng vấn
- Danh sách các buổi phỏng vấn đã làm (từ Supabase DB)
- Mỗi buổi hiển thị: ngày, loại phỏng vấn, điểm tổng, xếp loại
- Click vào để xem chi tiết từng câu hỏi

---

## 8. Frontend — Avatar 3D (tái sử dụng pattern hiện có)

Avatar component cần hỗ trợ các animation states:
```javascript
const AVATAR_STATES = {
  IDLE: "Idle",           // Đứng yên, chờ user
  GREETING: "Greeting",  // Chào khi bắt đầu
  TALKING: "Talking",    // Đang đọc câu hỏi (+ lip sync)
  THINKING: "Thinking",  // Đang xử lý (loading)
  REACTING: "Reacting",  // Phản ứng sau khi nhận câu trả lời
};
```

Lip sync: Dùng `Web Speech API` (`speechSynthesis`) với:
- `lang = 'vi-VN'`
- Viseme mapping giống `Avatar.jsx` trong `history_assistant`
- Khi đọc xong câu hỏi → chuyển về `IDLE`, bật mic

---

## 9. Quản lý Session — Supabase DB Schema

Dùng **Supabase PostgreSQL** để lưu toàn bộ dữ liệu phỏng vấn.

### Bảng `interview_sessions`
```sql
CREATE TABLE interview_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_file_url  TEXT,              -- URL file PDF trên Supabase Storage
  cv_text      TEXT,              -- Nội dung text đã extract từ PDF
  interview_type VARCHAR(20),     -- 'technical' | 'behavioral' | 'mixed'
  total_questions INT,
  current_index   INT DEFAULT 0,
  total_score     FLOAT,          -- Điền sau khi kết thúc
  grade           VARCHAR(2),     -- 'A' | 'B' | 'C' | 'D'
  summary_json    JSONB,          -- Lưu strengths, weaknesses, tips
  status       VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress' | 'completed'
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### Bảng `interview_logs` (từng câu hỏi)
```sql
CREATE TABLE interview_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_index INT,
  question_type  VARCHAR(20),     -- 'technical' | 'behavioral'
  question       TEXT,
  user_answer    TEXT,
  score          FLOAT,           -- 0–10
  feedback       TEXT,
  suggestion     TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)
```sql
-- User chỉ thấy data của chính mình
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_sessions" ON interview_sessions
  USING (auth.uid() = user_id);

ALTER TABLE interview_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_logs" ON interview_logs
  USING (session_id IN (
    SELECT id FROM interview_sessions WHERE user_id = auth.uid()
  ));
```

### In-memory cache (Backend)
```python
# Chỉ cache cv_text và conversation_history trong memory
# để tránh query DB liên tục trong 1 buổi phỏng vấn
# Sau khi kết thúc hoặc sau 2 giờ → xóa cache
_session_cache = {
  "uuid-xxxx": {
    "cv_text": "...",
    "conversation_history": [...],
    "questions_asked": [...],
  }
}
```

---

## 10. File & Folder Structure đề xuất

```
interview-practice/
├── backend/
│   ├── .env                  # GOOGLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
│   ├── pyproject.toml        # uv dependencies
│   ├── main.py               # FastAPI app entry
│   ├── api/
│   │   └── routes/
│   │       ├── upload.py         # POST /upload-cv
│   │       ├── session.py        # POST /start-session, /next-question
│   │       ├── evaluate.py       # POST /evaluate
│   │       ├── summary.py        # POST /summary
│   │       └── history.py        # GET /history
│   ├── core/
│   │   ├── cv_parser.py          # Parse PDF → text (pdfplumber)
│   │   ├── interviewer.py        # LangChain chain sinh câu hỏi
│   │   ├── evaluator.py          # Chấm điểm câu trả lời
│   │   ├── session_cache.py      # In-memory cache (cv_text, history)
│   │   └── rate_limiter.py       # _RateLimiter class (giống RAG_BOT)
│   ├── db/
│   │   └── supabase_client.py    # Khởi tạo supabase-py client
│   └── models/
│       └── schemas.py            # Pydantic request/response models
│
└── frontend/
    ├── vite.config.js
    ├── package.json
    ├── .env                      # VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
    ├── public/
    │   ├── models/
    │   │   └── interviewer.glb   # Avatar 3D model
    │   └── animation/
    │       ├── Idle.fbx
    │       ├── Talking.fbx
    │       └── Thinking.fbx
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── lib/
        │   └── supabaseClient.js     # createClient(url, anonKey)
        ├── pages/
        │   ├── LoginPage.jsx         # Đăng nhập / đăng ký
        │   ├── UploadPage.jsx        # Upload CV
        │   ├── SetupPage.jsx         # Cấu hình phỏng vấn
        │   ├── InterviewPage.jsx     # Màn hình phỏng vấn chính
        │   ├── SummaryPage.jsx       # Kết quả
        │   └── HistoryPage.jsx       # Lịch sử các buổi
        ├── components/
        │   ├── Avatar.jsx            # 3D Avatar + lip sync (tái dùng)
        │   ├── QuestionPanel.jsx     # Panel câu hỏi bên phải
        │   ├── MicButton.jsx         # Nút thu âm
        │   ├── FeedbackCard.jsx      # Hiển thị đánh giá
        │   ├── ScoreBoard.jsx        # Bảng điểm tổng kết
        │   └── ProtectedRoute.jsx    # Guard redirect về /login
        ├── hooks/
        │   ├── useInterview.js       # State & logic phỏng vấn
        │   ├── useSpeechRecognition.js  # Tái dùng từ dự án cũ
        │   ├── useSpeechSynthesis.js    # Tái dùng từ dự án cũ
        │   └── useAuth.js            # Supabase auth state
        ├── api/
        │   └── interviewService.js   # Axios calls + đính kèm JWT
        ├── utils/
        │   └── lipsync.js            # Tái dùng từ dự án cũ
        └── styles/
            └── index.css
```

---

## 11. Design & UX Requirements

- **Theme**: Dark mode, màu chủ đạo là xanh dương đậm + trắng (gợi cảm giác chuyên nghiệp, corporate)
- **Font**: `Inter` hoặc `Roboto` (Google Fonts)
- **Avatar background**: Phòng văn phòng tối giản, ánh sáng studio, gradient tối
- **Animations**:
  - Smooth transition giữa các trang
  - Câu hỏi xuất hiện với hiệu ứng typewriter
  - Điểm tổng kết đếm ngược animated
  - Loading spinner khi AI đang suy nghĩ
- **Responsive**: Ưu tiên desktop (1280px+), có hỗ trợ tablet
- **Màu feedback**:
  - Điểm 8–10: Xanh lá ✅
  - Điểm 5–7: Vàng ⚠️
  - Điểm 0–4: Đỏ ❌

---

## 12. Biến môi trường (.env)

### Backend
```
GOOGLE_API_KEY=your_gemini_api_key
GEMINI_RATE_LIMIT_RPM=15
GEMINI_MAX_RETRIES=6
SESSION_CACHE_TTL_SECONDS=7200

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key   # Dùng service key để backend bypass RLS
```

### Frontend
```
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key         # Dùng anon key ở frontend, RLS bảo vệ data
```

---

## 13. Dependencies cần cài

### Backend (uv)
```
fastapi uvicorn python-dotenv langchain langchain-core
langchain-google-genai pdfplumber python-multipart pydantic
supabase                    # supabase-py client
```

### Frontend (yarn/npm)
```
react react-dom react-router-dom axios
@react-three/fiber @react-three/drei three three-stdlib
@supabase/supabase-js       # Supabase Auth + Storage client
vite @vitejs/plugin-react
```

---

## 14. Câu hỏi mẫu AI sẽ hỏi (theo loại)

### Technical (dựa vào CV)
- "Trong CV bạn có đề cập đến [công nghệ X], bạn có thể giải thích cách bạn sử dụng nó trong dự án [Y] không?"
- "Bạn xử lý [vấn đề kỹ thuật cụ thể] như thế nào trong dự án gần đây nhất?"
- "Sự khác biệt giữa [công nghệ A] và [công nghệ B] là gì? Tại sao bạn chọn cái này?"

### Behavioral (dựa vào kinh nghiệm)
- "Hãy kể về một lần bạn gặp deadline gấp. Bạn đã xử lý như thế nào? (STAR method)"
- "Kể về một xung đột với thành viên trong nhóm và cách bạn giải quyết."
- "Dự án nào bạn tự hào nhất trong CV này và tại sao?"

---

## 15. Edge Cases cần xử lý

- [ ] CV không đọc được (scan image, không phải text PDF) → thông báo lỗi rõ ràng
- [ ] CV quá ngắn (dưới 100 từ) → cảnh báo, vẫn cho tiếp tục
- [ ] User gửi câu trả lời rỗng → yêu cầu nhập lại
- [ ] Gemini rate limit → hiển thị loading, retry tự động (giống RAG_BOT)
- [ ] Supabase Auth token hết hạn → tự refresh hoặc redirect về /login
- [ ] Upload PDF lên Supabase Storage thất bại → thông báo lỗi + cho retry
- [ ] Mic không được cấp quyền → fallback về text input
- [ ] Avatar model load lỗi → ẩn Avatar, chỉ hiển thị text
- [ ] User đóng tab giữa chừng → session vẫn còn trong DB, vào lại tiếp tục được
