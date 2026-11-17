"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Save, RotateCcw } from "lucide-react";
import { getUserSettings, updateUserSettings } from "@/lib/user-settings-client";
import { settingsOptions, type UserSettings, type UserSettingsUpdate } from "@/lib/user-settings";
import MicTester from "./mic-tester";
import SpeechPreview from "./speech-preview";
import SettingsToast from "./settings-toast";
import SettingsSkeleton from "./settings-skeleton";

const fields = ["speech_voice_uri", "speech_rate", "ai_voice", "live_transcript", "vocabulary_hints"] as const;
const control = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export default function LiveAudioSettings({ active }: { active: boolean }) {
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
    <div className="space-y-6">
    {active && <MicTester />}
    <form onSubmit={submit} aria-busy={saving} className="mb-36 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6 sm:px-8">
        <h2 className="text-lg font-bold text-primary">Giọng đọc & Phòng Live</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">Nghe thử giọng tiếng Nhật và chọn các tiện ích hỗ trợ luyện tập.</p>
      </div>
      <fieldset disabled={saving} className="space-y-6 p-6 sm:p-8">
        <legend className="sr-only">Tùy chọn âm thanh và phòng Live</legend>
        <div>
          <label htmlFor="live-voice" className="text-sm font-semibold">Giọng AI trong Gemini Live</label>
          <select id="live-voice" className={control} value={draft.ai_voice} onChange={(event) => change("ai_voice", event.target.value as UserSettings["ai_voice"])}>
            {settingsOptions.ai_voice.map((voice) => <option key={voice} value={voice}>{voice}</option>)}
          </select>
        </div>
        {active && <SpeechPreview voiceUri={draft.speech_voice_uri} rate={draft.speech_rate} disabled={saving} onVoiceChange={(uri) => change("speech_voice_uri", uri)} />}
        <div>
          <label htmlFor="speech-rate" className="text-sm font-semibold">Tốc độ nghe thử</label>
          <select id="speech-rate" className={control} value={draft.speech_rate} onChange={(event) => change("speech_rate", Number(event.target.value) as UserSettings["speech_rate"])}>
            {settingsOptions.speech_rate.map((rate) => <option key={rate} value={rate}>{rate}×{rate === 1 ? " — Bình thường" : ""}</option>)}
          </select>
        </div>
        {([
          ["live_transcript", "Live Transcript", "Hiển thị bản chép lời trong phòng phỏng vấn."],
          ["vocabulary_hints", "Gợi ý từ vựng", "Hiển thị gợi ý từ vựng khi luyện tập."],
        ] as const).map(([key, label, description]) => <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
          <div><label id={`${key}-label`} htmlFor={key} className="text-sm font-semibold">{label}</label><p id={`${key}-help`} className="mt-1 text-xs text-slate-500">{description}</p></div>
          <button id={key} type="button" role="switch" aria-checked={draft[key]} aria-labelledby={`${key}-label`} aria-describedby={`${key}-help`} onClick={() => change(key, !draft[key])} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${draft[key] ? "bg-primary" : "bg-slate-300"}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all ${draft[key] ? "left-6" : "left-1"}`} /></button>
        </div>)}
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
    </div>
  );
}
