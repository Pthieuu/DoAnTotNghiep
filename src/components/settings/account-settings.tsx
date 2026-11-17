"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Save, RotateCcw } from "lucide-react";
import { getUserSettings, updateUserSettings } from "@/lib/user-settings-client";
import { settingsOptions, type UserSettings, type UserSettingsUpdate } from "@/lib/user-settings";
import type { AuthUser } from "@/lib/auth-types";
import DangerZone from "./danger-zone";
import SettingsToast from "./settings-toast";
import SettingsSkeleton from "./settings-skeleton";

const fields = ["email_reminders", "reminder_frequency"] as const;
const control = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

export default function AccountSettings({ user, active }: { user: AuthUser; active: boolean }) {
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
    <div className="space-y-6 pb-36">
    <form onSubmit={submit} aria-busy={saving} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6 sm:px-8">
        <h2 className="text-lg font-bold text-primary">Tài khoản & Nhắc nhở</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">Quản lý thông tin tài khoản và lựa chọn nhận nhắc nhở.</p>
      </div>
      <fieldset disabled={saving} className="space-y-6 p-6 sm:p-8">
        <legend className="sr-only">Nhắc nhở luyện tập qua email</legend>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-slate-500">Tên hiển thị</dt><dd className="mt-1 break-words font-semibold">{user.name || "Chưa cập nhật"}</dd></div>
          <div><dt className="text-sm text-slate-500">Email</dt><dd className="mt-1 break-all font-semibold">{user.email}</dd></div>
        </dl>
        <div className="flex items-center justify-between gap-4">
          <label id="reminders-label" htmlFor="email-reminders" className="text-sm font-semibold">Nhắc luyện tập qua email</label>
          <button id="email-reminders" type="button" role="switch" aria-checked={draft.email_reminders} aria-labelledby="reminders-label" onClick={() => change("email_reminders", !draft.email_reminders)} className={`relative h-7 w-12 rounded-full ${draft.email_reminders ? "bg-primary" : "bg-slate-300"}`}><span className={`absolute top-1 size-5 rounded-full bg-white ${draft.email_reminders ? "left-6" : "left-1"}`} /></button>
        </div>
        <div><label htmlFor="reminder-frequency" className="text-sm font-semibold">Tần suất nhắc nhở</label>
          <select id="reminder-frequency" disabled={!draft.email_reminders || saving} value={draft.reminder_frequency} className={control} onChange={(event) => change("reminder_frequency", event.target.value as UserSettings["reminder_frequency"])}>
            {settingsOptions.reminder_frequency.map((value) => <option key={value} value={value}>{value === "daily" ? "Hằng ngày" : "Hằng tuần"}</option>)}
          </select>
        </div>
      </fieldset>
      <div className="mx-6 mb-6 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600 sm:mx-8">Lựa chọn nhận email được lưu cho tài khoản. Email nhắc nhở chưa được gửi tự động; tính năng gửi định kỳ sẽ được bổ sung sau.</div>
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
    {active && <DangerZone />}
    </div>
  );
}
