"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Save, RotateCcw } from "lucide-react";
import { getUserSettings, updateUserSettings } from "@/lib/user-settings-client";
import { settingsOptions, type UserSettings, type UserSettingsUpdate } from "@/lib/user-settings";
import SettingsToast from "./settings-toast";
import SettingsSkeleton from "./settings-skeleton";

const fields = ["default_jlpt", "interview_lang", "eval_framework", "question_count"] as const;
const control = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export default function InterviewPreferencesForm() {
  const [saved, setSaved] = useState<UserSettings | null>(null);
  const [draft, setDraft] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const saveLock = useRef(false);

  useEffect(() => {
    let active = true;
    getUserSettings().then((settings) => {
      if (active) { setSaved(settings); setDraft(settings); }
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Không thể tải cài đặt.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  function change<Key extends keyof UserSettings>(key: Key, value: UserSettings[Key]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setSuccess(false);
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft || !saved || saveLock.current) return;
    const patch = Object.fromEntries(fields.filter((key) => draft[key] !== saved[key]).map((key) => [key, draft[key]])) as UserSettingsUpdate;
    if (!Object.keys(patch).length) return;
    saveLock.current = true;
    setSaving(true); setError(""); setSuccess(false);
    try {
      const result = await updateUserSettings(patch);
      setSaved(result); setDraft(result); setSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu cài đặt. Vui lòng thử lại.");
    } finally { saveLock.current = false; setSaving(false); }
  }

  if (loading) return <SettingsSkeleton />;
  if (!draft || !saved) return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <p role="alert" className="text-sm text-red-700">{error}</p>
      <button type="button" className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white" onClick={() => { setError(""); setLoading(true); setAttempt((value) => value + 1); }}>Thử lại</button>
    </div>
  );
  const dirty = fields.some((key) => draft[key] !== saved[key]);
  return (
    <form onSubmit={submit} aria-busy={saving} className="mb-36 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6 sm:px-8">
        <h2 className="text-lg font-bold text-primary">Tùy chọn luyện tập</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">Thiết lập trình độ và cách bạn muốn luyện phỏng vấn với AI.</p>
      </div>
      <fieldset disabled={saving} className="grid gap-7 p-6 sm:grid-cols-2 sm:p-8">
        <legend className="sr-only">Luyện tập &amp; Phỏng vấn</legend>
        <div>
          <label htmlFor="settings-jlpt" className="text-sm font-semibold text-slate-800">JLPT mặc định</label>
          <select id="settings-jlpt" className={control} value={draft.default_jlpt} onChange={(e) => change("default_jlpt", e.target.value as UserSettings["default_jlpt"])}>
            {settingsOptions.default_jlpt.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500">Chọn trình độ tiếng Nhật bạn muốn hướng tới.</p>
        </div>
        <div>
          <label htmlFor="settings-language" className="text-sm font-semibold text-slate-800">Ngôn ngữ AI</label>
          <select id="settings-language" className={control} value={draft.interview_lang} onChange={(e) => change("interview_lang", e.target.value as UserSettings["interview_lang"])}>
            <option value="ja">Tiếng Nhật</option><option value="vi">Tiếng Việt</option>
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500">Ngôn ngữ bạn muốn AI sử dụng khi phỏng vấn.</p>
        </div>
        <div>
          <label htmlFor="settings-framework" className="text-sm font-semibold text-slate-800">Khung chấm điểm</label>
          <select id="settings-framework" aria-describedby="settings-framework-help" className={control} value={draft.eval_framework} onChange={(e) => change("eval_framework", e.target.value as UserSettings["eval_framework"])}>
            <option value="PREP">PREP — Trình bày quan điểm</option><option value="STAR">STAR — Kể lại kinh nghiệm</option>
          </select>
          <p id="settings-framework-help" className="mt-2 text-xs leading-5 text-slate-500">{draft.eval_framework === "PREP" ? "Quan điểm → Lý do → Ví dụ → Kết luận." : "Tình huống → Nhiệm vụ → Hành động → Kết quả."}</p>
        </div>
        <div>
          <label htmlFor="settings-count" className="text-sm font-semibold text-slate-800">Số câu hỏi mặc định</label>
          <select id="settings-count" className={control} value={draft.question_count} onChange={(e) => change("question_count", Number(e.target.value) as UserSettings["question_count"])}>
            {settingsOptions.question_count.map((count) => <option key={count} value={count}>{count} câu hỏi</option>)}
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500">Điều chỉnh độ dài buổi luyện tập theo thời gian của bạn.</p>
        </div>
      </fieldset>
      <div className="mx-6 mb-6 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600 sm:mx-8">Các tùy chọn được lưu cho tài khoản của bạn. Việc tự động áp dụng vào buổi phỏng vấn sẽ được bổ sung ở bước tiếp theo.</div>
      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur sm:px-8 lg:left-64">
        <div aria-live="polite" className="text-sm">
          {error ? <p role="alert" className="text-red-700">{error}</p> : success ? <p className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={16} aria-hidden="true" />Đã lưu cài đặt.</p> : <p className="text-slate-500">{dirty ? "Bạn có thay đổi chưa lưu." : "Cài đặt đã được đồng bộ."}</p>}
        </div>
        <div className="flex gap-3">
          <button type="button" disabled={!dirty || saving} onClick={() => { setDraft(saved); setError(""); setSuccess(false); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-40"><RotateCcw size={16} aria-hidden="true" />Hủy thay đổi</button>
          <button type="submit" disabled={!dirty || saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-container disabled:opacity-40">{saving ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}{saving ? "Đang lưu…" : "Lưu thay đổi"}</button>
        </div>
      </div>
      {success && <SettingsToast message="Đã lưu cài đặt." />}
    </form>
  );
}
