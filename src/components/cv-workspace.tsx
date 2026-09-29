"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import Icon, { type IconName } from "@/components/icon";

type CvState = "empty" | "processing" | "parsed" | "confirmed";
const demoFile = "Resume_PhamTrungHieu_VKU_Backend.pdf";

export default function CvWorkspace() {
  const [state, setState] = useState<CvState>("empty");
  const [fileName, setFileName] = useState(demoFile);
  const [progress, setProgress] = useState(68);
  const [error, setError] = useState("");
  const [sampleOpen, setSampleOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sync, setSync] = useState<"idle" | "yes" | "no">("idle");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state !== "processing") return;
    setProgress(15);
    const timer = window.setInterval(
      () =>
        setProgress((value) => {
          const next = Math.min(100, value + 17);
          if (next === 100) {
            window.clearInterval(timer);
            window.setTimeout(() => setState("parsed"), 450);
          }
          return next;
        }),
      450,
    );
    return () => window.clearInterval(timer);
  }, [state]);

  function acceptFile(file?: File) {
    if (!file) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setError("Hệ thống hỗ trợ tệp PDF hoặc DOCX.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Dung lượng tệp vượt quá giới hạn 15MB.");
      return;
    }
    setFileName(file.name);
    setError("");
    setState("processing");
  }
  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0]);
    event.target.value = "";
  }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  }

  const button =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors";
  const card = "rounded-2xl border border-surface-container bg-white shadow-sm";
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] text-on-surface-variant">
            <span>Workspace</span>
            <Icon name="chevron_right" />
            <span className="font-semibold text-primary">My CV</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary-fixed text-primary">
              <Icon name="description" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-primary">
                My CV
              </h1>
              <p className="mt-1 text-sm text-on-surface-variant">
                Chuẩn bị hồ sơ để AI hiểu kinh nghiệm và cá nhân hóa buổi phỏng
                vấn.
              </p>
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-[11px] font-medium text-on-surface-variant">
          <span
            className={`size-2 rounded-full ${state === "confirmed" ? "bg-emerald-500" : state === "parsed" ? "bg-amber-500" : "bg-secondary"}`}
          />
          {state === "confirmed"
            ? "CV đã xác nhận"
            : state === "parsed"
              ? "Chờ bạn kiểm tra"
              : state === "processing"
                ? "Đang phân tích"
                : "Chưa có CV"}
        </span>
      </div>

      {state === "empty" && (
        <>
          <section className={`${card} p-5 sm:p-8`}>
            <div
              onClick={() => input.current?.click()}
              onDrop={onDrop}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors ${dragging ? "border-secondary bg-secondary-fixed/30" : "border-outline-variant hover:border-secondary hover:bg-surface-container-low/60"}`}
            >
              <span className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-secondary-fixed text-primary">
                <Icon name="cloud_upload" />
              </span>
              <h2 className="text-base font-semibold text-primary">
                Kéo và thả tệp CV của bạn vào đây
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                hoặc nhấn để duyệt tệp từ máy tính
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                <Icon name="info" />
                Định dạng hỗ trợ: <strong>PDF, DOCX</strong> · Tối đa 15MB
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  input.current?.click();
                }}
                className={`${button} mt-5 bg-primary text-white hover:bg-secondary`}
              >
                <Icon name="upload_file" />
                Chọn tệp CV tải lên
              </button>
              <input
                ref={input}
                onChange={onFileChange}
                accept=".pdf,.docx"
                className="hidden"
                type="file"
                aria-label="Chọn tệp CV"
              />
            </div>
            {error && (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-error-container px-4 py-3 text-xs text-on-error-container"
              >
                {error}
              </p>
            )}
            <div className="mt-6 grid gap-3 border-t border-surface-container pt-6 md:grid-cols-3">
              {[
                {
                  icon: "psychology",
                  title: "Hiểu đúng kinh nghiệm",
                  desc: "Nhận diện tech stack, đồ án và kinh nghiệm thực tế.",
                },
                {
                  icon: "forum",
                  title: "Hỏi sâu vào dự án",
                  desc: "Tạo câu hỏi theo quyết định kỹ thuật và cách bạn xử lý vấn đề.",
                },
                {
                  icon: "verified_user",
                  title: "Dữ liệu riêng tư",
                  desc: "Hồ sơ giúp cá nhân hóa nội dung luyện tập của bạn.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-3 rounded-xl bg-surface-container-low/70 p-4"
                >
                  <span className="text-secondary">
                    <Icon name={item.icon as IconName} />
                  </span>
                  <div>
                    <h3 className="text-xs font-semibold text-primary">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <div
            className={`${card} flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center`}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
                <Icon name="edit_document" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-primary">
                  Chưa có tệp CV hoàn chỉnh?
                </h3>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Bạn vẫn có thể xem trước thông tin mẫu để bắt đầu.
                </p>
              </div>
            </div>
            <button
              onClick={() => setState("parsed")}
              className={`${button} border border-outline-variant text-primary hover:bg-surface-container-low`}
            >
              Nhập thông tin thủ công
            </button>
          </div>
        </>
      )}

      {state === "processing" && (
        <section className={`${card} p-5 sm:p-8`}>
          <div className="flex items-center gap-4 rounded-xl bg-surface-container-low p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Icon name="description" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3">
                <strong className="truncate text-sm text-primary">
                  {fileName}
                </strong>
                <strong className="text-xs text-secondary">{progress}%</strong>
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">
                Đang tải lên và phân tích tệp CV…
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full bg-secondary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mx-auto mt-8 max-w-lg space-y-5">
            {[
              "Tải tệp lên hệ thống",
              "Phân tích cấu trúc tài liệu",
              "Trích xuất học vấn và kinh nghiệm",
              "Nhận diện kỹ năng công nghệ cốt lõi",
            ].map((step, index) => (
              <div className="flex items-center gap-3" key={step}>
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-xs ${index < 2 ? "bg-emerald-100 text-emerald-700" : index === 2 ? "animate-pulse bg-secondary-fixed text-primary" : "bg-surface-container text-on-surface-variant"}`}
                >
                  {index < 2 ? "✓" : index + 1}
                </span>
                <span className="flex-1 text-xs font-medium text-primary">
                  {step}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {index < 2
                    ? "Hoàn tất"
                    : index === 2
                      ? "Đang xử lý"
                      : "Đang chờ"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-on-surface-variant">
            Quá trình này thường mất khoảng 10–20 giây.
          </p>
        </section>
      )}

      {(state === "parsed" || state === "confirmed") && (
        <>
          {state === "confirmed" && (
            <div className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <span className="text-emerald-700">
                <Icon name="check_circle" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-primary">
                  CV đã sẵn sàng cho buổi luyện phỏng vấn!
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                  Hồ sơ đã được xác nhận và dùng làm ngữ cảnh cho buổi luyện
                  tập.
                </p>
              </div>
            </div>
          )}
          <section
            className={`${card} flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <Icon name="description" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-primary">
                  {fileName}
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">
                  2.4 MB ·{" "}
                  {state === "confirmed"
                    ? "Đã xác nhận và đồng bộ hồ sơ"
                    : "Trích xuất thành công · Hôm nay"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setState("empty")}
                className={`${button} border border-surface-container text-primary hover:bg-surface-container-low`}
              >
                <Icon name="autorenew" />
                Thay file khác
              </button>
            </div>
          </section>
          {state === "parsed" && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <Icon name="info" />
              <p>
                <strong>Vui lòng kiểm tra thông tin AI vừa đọc từ CV.</strong>
                <br />
                Thông tin dưới đây là dữ liệu mẫu để minh họa giao diện; bạn có
                thể chỉnh sửa trước khi xác nhận.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-primary">
              Thông tin AI đọc được từ CV
            </h2>
            <span className="text-[11px] text-on-surface-variant">
              4 nhóm chính
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: "school",
                title: "Học vấn & bằng cấp",
                summary: "VKU · Công nghệ Thông tin · GPA 3.62 / 4.0",
                details:
                  "Vietnam-Korea University of ICT (VKU) · Cử nhân Công nghệ Thông tin · JLPT N2 (128 điểm)",
              },
              {
                icon: "work_outline",
                title: "Kinh nghiệm làm việc",
                summary: "Da Nang Tech Partner · Backend Intern · 9 tháng",
                details:
                  "Tham gia phát triển API thanh toán và tích hợp webhook; phối hợp cùng nhóm 5 kỹ sư.",
              },
              {
                icon: "terminal",
                title: "Kỹ năng công nghệ",
                summary: "PHP · Laravel · MySQL · REST API · Webhook",
                details:
                  "Thiết kế REST API, quản lý transaction, xử lý idempotency và tích hợp 3D Secure.",
              },
              {
                icon: "rocket_launch",
                title: "Dự án nổi bật",
                summary: "EC Webhook · Tích hợp thanh toán",
                details:
                  "Thiết kế luồng xử lý webhook an toàn, retry có kiểm soát và ngăn giao dịch trùng lặp.",
              },
            ].map((item, index) => (
              <details
                key={item.title}
                open={state === "confirmed"}
                className={`${card} group overflow-hidden`}
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 hover:bg-surface-container-low">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-secondary-fixed text-primary">
                    <Icon name={item.icon as IconName} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-xs text-primary">
                      {index + 1}. {item.title}
                    </strong>
                    <span className="mt-1 block truncate text-[11px] text-on-surface-variant">
                      {item.summary}
                    </span>
                  </span>
                  <span className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                    Đầy đủ
                  </span>
                  <span className="text-on-surface-variant transition-transform group-open:rotate-180">
                    <Icon name="expand_more" />
                  </span>
                </summary>
                <div className="border-t border-surface-container px-4 py-4 text-xs leading-relaxed text-on-surface-variant">
                  {item.details}
                  <button
                    className="ml-3 inline-flex items-center gap-1 font-semibold text-secondary"
                    type="button"
                  >
                    <Icon name="edit_document" />
                    Chỉnh sửa
                  </button>
                </div>
              </details>
            ))}
          </div>
          <section className={`${card} overflow-hidden`}>
            <button
              type="button"
              onClick={() => setSampleOpen(!sampleOpen)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-surface-container-low"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-primary">
                <Icon name="quiz" />
                Xem câu hỏi AI dự kiến dựa trên CV này
              </span>
              <span className="text-xs text-secondary">
                {sampleOpen ? "Thu gọn" : "Xem thử"}
              </span>
            </button>
            {sampleOpen && (
              <div className="border-t border-surface-container bg-surface-container-low/50 p-4">
                <span className="rounded bg-secondary-fixed px-2 py-1 text-[10px] font-bold text-primary">
                  Kỹ thuật & kiến trúc
                </span>
                <p
                  lang="ja"
                  className="mt-3 text-sm leading-relaxed text-primary"
                >
                  「決済Webhookの冪等性を担保するために、どのようなリトライ処理とトランザクション制御を設計しましたか？」
                </p>
                <p className="mt-2 text-xs text-on-surface-variant">
                  Câu hỏi kiểm tra tư duy thiết kế hệ thống chịu lỗi và khả năng
                  diễn đạt tiếng Nhật chuyên ngành.
                </p>
              </div>
            )}
          </section>
          {state === "parsed" && (
            <>
              {sync !== "idle" && (
                <p className="rounded-lg bg-surface-container-low p-3 text-xs text-on-surface-variant">
                  {sync === "yes"
                    ? "Đã ghi nhận lựa chọn đồng bộ thông tin vào My Profile."
                    : "Đã bỏ qua đồng bộ. Dữ liệu này chỉ dùng trong phần CV."}
                </p>
              )}
              <div className="flex flex-col gap-3 border-t border-surface-container pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() => setSync("no")}
                  className={`${button} border border-outline-variant text-primary hover:bg-surface-container-low`}
                >
                  Chỉnh sửa thủ công
                </button>
                <button
                  onClick={() => {
                    setSync("yes");
                    setState("confirmed");
                  }}
                  className={`${button} bg-primary px-5 text-white hover:bg-secondary`}
                >
                  <Icon name="verified" />
                  Xác nhận thông tin CV để luyện tập
                </button>
              </div>
            </>
          )}
          {state === "confirmed" && (
            <div className="flex flex-col items-center gap-2 pt-3">
              <button
                className={`${button} bg-primary px-6 py-3 text-sm text-white hover:bg-secondary`}
              >
                <span>Chuyển sang thiết lập buổi phỏng vấn</span>
                <Icon name="arrow_forward" />
              </button>
              <p className="text-xs text-on-surface-variant">
                Chọn mục tiêu công ty và vai trò ở bước tiếp theo.
              </p>
            </div>
          )}
        </>
      )}

      <div className="fixed inset-x-3 bottom-3 z-20 mx-auto flex max-w-max items-center gap-1 overflow-x-auto rounded-2xl border border-surface-container bg-white/95 p-2 shadow-lg backdrop-blur sm:inset-x-auto sm:right-5 sm:mx-0">
        {(["empty", "processing", "parsed", "confirmed"] as CvState[]).map(
          (value, index) => (
            <button
              key={value}
              onClick={() => setState(value)}
              className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-[10px] font-semibold transition-colors ${state === value ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container-low"}`}
            >
              {index + 1}.{" "}
              {
                [
                  "Chưa có CV",
                  "Đang phân tích",
                  "Đã trích xuất",
                  "Đã xác nhận",
                ][index]
              }
            </button>
          ),
        )}
      </div>
    </div>
  );
}
