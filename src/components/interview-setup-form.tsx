"use client";

import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/icon";
import type { CvData } from "@/lib/cv-schema";
import {
  getInterviewSessionContext,
  getInterviewQuickPrefs,
  saveInterviewQuickPrefs,
  estimateInterviewDuration,
  type InterviewSessionContext,
} from "@/lib/interview-session-context";

type SetupCv = { fileName: string; data: CvData | null };

const INTERVIEW_TYPE_OPTIONS = [
  { value: "mixed", label: "Tổng hợp", badge: "HR & Kỹ thuật" },
  { value: "technical", label: "Kỹ thuật", badge: "Chuyên môn" },
  { value: "behavioral", label: "Kỹ năng mềm", badge: "Hành vi STAR" },
];

const LANGUAGE_OPTIONS = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "ja", label: "Tiếng Nhật" },
];

const QUESTION_COUNT_OPTIONS = [4, 6, 8, 10];

export default function InterviewSetupForm({ cv }: { cv: SetupCv | null }) {
  const router = useRouter();

  // Session Context & Hydration
  const [sessionCtx, setSessionCtx] = useState<InterviewSessionContext | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Form Fields
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [level, setLevel] = useState("N3");
  const [questionCount, setQuestionCount] = useState<number>(6);
  const [interviewType, setInterviewType] = useState("mixed");
  const [interviewLanguage, setInterviewLanguage] = useState("vi");

  // Status & Submission
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  // Read session context & user preferences on client mount
  useEffect(() => {
    try {
      const stored = getInterviewSessionContext();
      const prefs = getInterviewQuickPrefs();

      if (stored) {
        setSessionCtx(stored);
        if (stored.jobPosition) setRole(stored.jobPosition);
        if (stored.companyName) setCompany(stored.companyName);
        if (stored.jobDescription) setJobDescription(stored.jobDescription);
        if (stored.jlptTarget) setLevel(stored.jlptTarget);
      } else if (cv) {
        // Fallback to database CV
        setRole("Backend Developer");
      }

      if (prefs) {
        if (prefs.interviewType) setInterviewType(prefs.interviewType);
        if (prefs.interviewLanguage) setInterviewLanguage(prefs.interviewLanguage);
        if (prefs.questionCount && QUESTION_COUNT_OPTIONS.includes(prefs.questionCount)) {
          setQuestionCount(prefs.questionCount);
        }
      }
    } catch (err) {
      console.error("Error reading interview context:", err);
    } finally {
      setIsInitialized(true);
    }
  }, [cv]);

  // Save quick preferences when options change
  const handleTypeChange = (val: string) => {
    setInterviewType(val);
    saveInterviewQuickPrefs({ interviewType: val, interviewLanguage, questionCount });
  };

  const handleLanguageChange = (val: string) => {
    setInterviewLanguage(val);
    saveInterviewQuickPrefs({ interviewType, interviewLanguage: val, questionCount });
  };

  const handleCountChange = (val: number) => {
    setQuestionCount(val);
    saveInterviewQuickPrefs({ interviewType, interviewLanguage, questionCount: val });
  };

  // Keyboard navigation helper for Segmented Pill groups
  const handlePillKeyDown = <T extends string | number>(
    e: KeyboardEvent<HTMLButtonElement>,
    options: T[],
    currentVal: T,
    onChange: (val: T) => void
  ) => {
    const currentIndex = options.indexOf(currentVal);
    let nextIndex = currentIndex;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % options.length;
      onChange(options[nextIndex]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + options.length) % options.length;
      onChange(options[nextIndex]);
    }
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanRole = role.trim();
    if (!cleanRole) {
      setError("Hãy nhập vị trí bạn muốn luyện phỏng vấn.");
      setIsEditingTarget(true);
      return;
    }
    if (cleanRole.length > 160) {
      setError("Tên vị trí tối đa 160 ký tự.");
      return;
    }
    if (company.trim().length > 160) {
      setError("Tên công ty tối đa 160 ký tự.");
      return;
    }
    if (jobDescription.length > 12000) {
      setError("Mô tả công việc tối đa 12.000 ký tự.");
      return;
    }

    setWorking(true);
    try {
      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: cleanRole,
          company: company.trim(),
          jobDescription: jobDescription.trim(),
          level,
          questionCount,
          interviewType,
          interviewLanguage,
          cvData: sessionCtx?.cvData || cv?.data || null,
          isManual: !sessionCtx && !cv,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Không thể tạo buổi phỏng vấn. Vui lòng thử lại.");
      }

      // Smooth direct navigation into interview room
      router.push(`/interview-room?sessionId=${encodeURIComponent(result.session.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tạo buổi phỏng vấn. Hãy thử lại.");
      setWorking(false);
    }
  }

  // Skeleton loading while checking sessionStorage
  if (!isInitialized) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pb-16 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/4" />
        <div className="h-8 bg-slate-200 rounded w-1/2" />
        <div className="h-24 bg-slate-100 rounded-2xl border border-surface-container" />
        <div className="h-64 bg-slate-100 rounded-2xl border border-surface-container" />
      </div>
    );
  }

  const hasContextOrCv = Boolean(sessionCtx || cv);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
        <span>Workspace</span>
        <Icon name="chevron_right" className="w-3.5 h-3.5 text-slate-400" />
        <span className="font-semibold text-primary">Interview Setup</span>
      </div>

      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Thiết lập buổi phỏng vấn
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-on-surface-variant">
          Chọn cấu hình nhanh để bắt đầu phiên luyện tập bám sát hồ sơ ứng tuyển của bạn.
        </p>
      </header>

      {/* Case 1: Has Session Context (Synced from Check CV) */}
      {sessionCtx ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 sm:p-4 text-emerald-950 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon name="check_circle" className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-emerald-950">
                  Đã đồng bộ nội dung từ bản check CV mới nhất
                </p>
                <p
                  className="text-[11px] sm:text-xs text-emerald-800 truncate mt-0.5"
                  title={`${company || "Công ty chưa đặt"} · ${role || "Vị trí chưa đặt"} · ${sessionCtx.cvFileName}`}
                >
                  <strong className="font-medium text-emerald-950">
                    {company || "Công ty chưa đặt"}
                  </strong>{" "}
                  · {role || "Vị trí chưa đặt"} ·{" "}
                  <span className="opacity-80">{sessionCtx.cvFileName}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center text-xs">
              <button
                type="button"
                onClick={() => setIsEditingTarget(!isEditingTarget)}
                className="font-semibold text-emerald-900 hover:text-emerald-950 underline underline-offset-2 cursor-pointer"
              >
                {isEditingTarget ? "Thu gọn" : "Chỉnh sửa"}
              </button>
              <span className="text-emerald-300">|</span>
              <Link
                href="/cv-checker"
                className="font-semibold text-emerald-900 hover:text-emerald-950 underline underline-offset-2"
              >
                Check CV khác
              </Link>
            </div>
          </div>

          {/* Inline Edit for Company & Role */}
          {isEditingTarget && (
            <div className="mt-3 pt-3 border-t border-emerald-200/80 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="inline-role" className="text-[11px] font-semibold text-emerald-950 block mb-1">
                  Vị trí ứng tuyển <span className="text-red-500">*</span>
                </label>
                <input
                  id="inline-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  maxLength={160}
                  className="w-full text-xs rounded-lg border border-emerald-300 bg-white px-3 py-2 text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ví dụ: Backend Developer"
                />
              </div>
              <div>
                <label htmlFor="inline-company" className="text-[11px] font-semibold text-emerald-950 block mb-1">
                  Tên công ty
                </label>
                <input
                  id="inline-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  maxLength={160}
                  className="w-full text-xs rounded-lg border border-emerald-300 bg-white px-3 py-2 text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ví dụ: Hokkaido Electronics"
                />
              </div>
            </div>
          )}
        </section>
      ) : cv ? (
        /* Case 2: No Session Context, but CV confirmed in database */
        <section className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 sm:p-4 text-sky-950 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon name="verified" className="w-5 h-5 text-sky-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-sky-950">
                  Sử dụng CV đã xác nhận trong tài khoản
                </p>
                <p
                  className="text-[11px] sm:text-xs text-sky-800 truncate mt-0.5"
                  title={`${company || "Công ty chưa đặt"} · ${role || "Vị trí chưa đặt"} · ${cv.fileName}`}
                >
                  <strong className="font-medium text-sky-950">
                    {company || "Công ty chưa đặt"}
                  </strong>{" "}
                  · {role || "Vị trí chưa đặt"} · <span className="opacity-80">{cv.fileName}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center text-xs">
              <button
                type="button"
                onClick={() => setIsEditingTarget(!isEditingTarget)}
                className="font-semibold text-sky-900 hover:text-sky-950 underline underline-offset-2 cursor-pointer"
              >
                {isEditingTarget ? "Thu gọn" : "Chỉnh sửa"}
              </button>
              <span className="text-sky-300">|</span>
              <Link
                href="/cv-checker"
                className="font-semibold text-sky-900 hover:text-sky-950 underline underline-offset-2"
              >
                Check CV mới
              </Link>
            </div>
          </div>

          {isEditingTarget && (
            <div className="mt-3 pt-3 border-t border-sky-200/80 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="inline-role-db" className="text-[11px] font-semibold text-sky-950 block mb-1">
                  Vị trí ứng tuyển <span className="text-red-500">*</span>
                </label>
                <input
                  id="inline-role-db"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  maxLength={160}
                  className="w-full text-xs rounded-lg border border-sky-300 bg-white px-3 py-2 text-primary outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Ví dụ: Backend Developer"
                />
              </div>
              <div>
                <label htmlFor="inline-company-db" className="text-[11px] font-semibold text-sky-950 block mb-1">
                  Tên công ty
                </label>
                <input
                  id="inline-company-db"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  maxLength={160}
                  className="w-full text-xs rounded-lg border border-sky-300 bg-white px-3 py-2 text-primary outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Ví dụ: Rakuten"
                />
              </div>
            </div>
          )}
        </section>
      ) : (
        /* Case 3: No Context and No CV in Database */
        !isManualMode ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Icon name="info" className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-950 text-sm sm:text-base">
                  Bạn chưa có CV đã kiểm tra
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-amber-900 leading-relaxed">
                  Hãy check CV trước để câu hỏi sát với hồ sơ của bạn.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/cv-checker"
                className="px-4 py-2 text-xs font-semibold bg-primary text-white hover:bg-secondary rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                Đi tới Check CV <Icon name="arrow_forward" className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setIsManualMode(true)}
                className="px-4 py-2 text-xs font-semibold border border-amber-300 bg-white hover:bg-amber-100 text-amber-950 rounded-xl transition-colors cursor-pointer"
              >
                Bỏ qua, nhập thủ công
              </button>
            </div>
          </section>
        ) : (
          /* Manual Mode Minimal Form Fields */
          <section className="rounded-2xl border border-surface-container bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-2">
              <span className="text-xs font-semibold text-slate-700">Chế độ nhập thủ công</span>
              <Link href="/cv-checker" className="text-xs text-secondary hover:underline">
                Đi tới Check CV
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="manual-role" className="text-xs font-semibold text-primary block mb-1">
                  Vị trí ứng tuyển <span className="text-red-500">*</span>
                </label>
                <input
                  id="manual-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  maxLength={160}
                  required
                  placeholder="Ví dụ: Backend Developer"
                  className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-xs sm:text-sm text-primary outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </div>
              <div>
                <label htmlFor="manual-company" className="text-xs font-semibold text-primary block mb-1">
                  Công ty <span className="text-slate-400 font-normal">(không bắt buộc)</span>
                </label>
                <input
                  id="manual-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  maxLength={160}
                  placeholder="Ví dụ: Hokkaido Electronics"
                  className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-xs sm:text-sm text-primary outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </div>
            </div>
          </section>
        )
      )}

      {/* Main Quick Config Form */}
      <form onSubmit={submit} className="space-y-6">
        <div className="rounded-2xl border border-surface-container bg-white p-5 sm:p-7 shadow-sm space-y-6">
          {/* Quick Config 1: Loại phỏng vấn (Segmented Pills) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label id="interview-type-label" className="text-xs sm:text-sm font-semibold text-primary">
                Loại phỏng vấn
              </label>
              <span className="text-[11px] text-slate-400">Chọn 1 hình thức</span>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="interview-type-label"
              className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5"
            >
              {INTERVIEW_TYPE_OPTIONS.map((opt) => {
                const isSelected = interviewType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => handleTypeChange(opt.value)}
                    onKeyDown={(e) =>
                      handlePillKeyDown(
                        e,
                        INTERVIEW_TYPE_OPTIONS.map((o) => o.value),
                        interviewType,
                        handleTypeChange
                      )
                    }
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-xs ring-1 ring-primary"
                        : "bg-white text-slate-700 border-outline-variant/60 hover:bg-slate-50 hover:border-slate-400"
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                      {isSelected && <Icon name="check" className="w-3.5 h-3.5 text-white" />}
                      {opt.label}
                    </span>
                    <span
                      className={`text-[10px] mt-0.5 ${
                        isSelected ? "text-white/80" : "text-slate-400"
                      }`}
                    >
                      {opt.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Config 2: Ngôn ngữ (Segmented Pills) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label id="language-label" className="text-xs sm:text-sm font-semibold text-primary">
                Ngôn ngữ phỏng vấn
              </label>
              <span className="text-[11px] text-slate-400">Giọng nói AI</span>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="language-label"
              className="grid grid-cols-2 gap-2 sm:gap-2.5"
            >
              {LANGUAGE_OPTIONS.map((opt) => {
                const isSelected = interviewLanguage === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => handleLanguageChange(opt.value)}
                    onKeyDown={(e) =>
                      handlePillKeyDown(
                        e,
                        LANGUAGE_OPTIONS.map((o) => o.value),
                        interviewLanguage,
                        handleLanguageChange
                      )
                    }
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-xs ring-1 ring-primary"
                        : "bg-white text-slate-700 border-outline-variant/60 hover:bg-slate-50 hover:border-slate-400"
                    }`}
                  >
                    {isSelected && <Icon name="check" className="w-3.5 h-3.5 text-white shrink-0" />}
                    <span className="text-xs sm:text-sm font-semibold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Config 3: Số lượng câu hỏi (Segmented Pills) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label id="question-count-label" className="text-xs sm:text-sm font-semibold text-primary">
                Số lượng câu hỏi
              </label>
              <span className="text-xs font-medium text-secondary">
                Thời lượng ước tính: {estimateInterviewDuration(questionCount)}
              </span>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="question-count-label"
              className="grid grid-cols-4 gap-2 sm:gap-2.5"
            >
              {QUESTION_COUNT_OPTIONS.map((count) => {
                const isSelected = questionCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => handleCountChange(count)}
                    onKeyDown={(e) =>
                      handlePillKeyDown(
                        e,
                        QUESTION_COUNT_OPTIONS,
                        questionCount,
                        handleCountChange
                      )
                    }
                    className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-xs ring-1 ring-primary"
                        : "bg-white text-slate-700 border-outline-variant/60 hover:bg-slate-50 hover:border-slate-400"
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold">{count} câu</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Collapsible: Tùy chọn nâng cao (Collapsed by default) */}
          <div className="pt-2 border-t border-surface-container">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full flex items-center justify-between py-2 text-xs font-semibold text-slate-600 hover:text-primary transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Icon name="tune" className="w-4 h-4 text-slate-400" />
                Tùy chọn nâng cao (Trình độ JLPT, JD chi tiết)
              </span>
              <Icon
                name="expand_more"
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isAdvancedOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isAdvancedOpen && (
              <div className="mt-3 pt-3 space-y-4 border-t border-surface-container/60">
                <div>
                  <label htmlFor="jlpt-level" className="text-xs font-semibold text-primary block mb-1">
                    Trình độ JLPT mục tiêu
                  </label>
                  <select
                    id="jlpt-level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-xs sm:text-sm text-primary outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  >
                    {["N5", "N4", "N3", "N2", "N1"].map((item) => (
                      <option key={item} value={item}>
                        {item} {item === "N3" ? "(Chuẩn phổ biến)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="adv-jd" className="text-xs font-semibold text-primary block mb-1">
                    Mô tả công việc (JD) <span className="font-normal text-slate-400">(không bắt buộc)</span>
                  </label>
                  <textarea
                    id="adv-jd"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    maxLength={12000}
                    rows={4}
                    placeholder="Dán yêu cầu tuyển dụng để AI định hình câu hỏi sát hơn..."
                    className="w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-xs sm:text-sm text-primary outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                  />
                  <p className="mt-1 text-right text-[11px] text-slate-400">
                    {jobDescription.length.toLocaleString("vi-VN")} / 12.000
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert with Retry button */}
        {error && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs sm:text-sm text-red-800 flex items-start justify-between gap-3 shadow-xs"
          >
            <div className="flex items-start gap-2 min-w-0">
              <Icon name="error" className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="break-words">{error}</p>
            </div>
            <button
              type="submit"
              disabled={working}
              className="text-xs font-bold text-red-900 underline hover:text-red-950 shrink-0 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Action Button: Sticky bottom bar on Mobile, Standard on Desktop */}
        <div className="sticky bottom-4 z-20 sm:static bg-white/95 backdrop-blur-md sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none shadow-lg sm:shadow-none border border-surface-container sm:border-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link
            href="/cv-checker"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
          >
            <Icon name="arrow_back" className="w-3.5 h-3.5" /> Quay lại Check CV
          </Link>

          <button
            type="submit"
            disabled={working || (!hasContextOrCv && !isManualMode && !role.trim())}
            className="w-full sm:w-auto min-w-[200px] px-6 py-3 text-sm font-semibold bg-primary hover:bg-secondary text-white rounded-xl shadow-sm hover:shadow transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:cursor-wait disabled:opacity-60"
          >
            {working ? (
              <>
                <Icon name="autorenew" className="w-4 h-4 animate-spin" />
                Đang tạo bộ câu hỏi...
              </>
            ) : (
              <>
                Tạo bộ câu hỏi
                <Icon name="arrow_forward" className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
