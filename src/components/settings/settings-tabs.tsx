"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { BookOpen, Mic, ShieldCheck } from "lucide-react";
import InterviewPreferencesForm from "./interview-preferences-form";

import type { AuthUser } from "@/lib/auth-types";
import AccountSettings from "./account-settings";
import LiveAudioSettings from "./live-audio-settings";

const tabs = [
  { id: "practice", label: "Luyện tập & Phỏng vấn", icon: BookOpen },
  { id: "live", label: "Phòng Live & Âm thanh", icon: Mic },
  { id: "account", label: "Tài khoản & Quyền riêng tư", icon: ShieldCheck },
] as const;

export default function SettingsTabs({ user }: { user: AuthUser }) {
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length
      : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); setActive(next); buttons.current[next]?.focus();
  }
  return (
    <div>
      <div role="tablist" aria-label="Nhóm cài đặt" className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map(({ id, label, icon: Icon }, index) => (
          <button key={id} ref={(node) => { buttons.current[index] = node; }} id={`settings-tab-${id}`} role="tab" type="button" aria-selected={active === index} aria-controls={`settings-panel-${id}`} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(event) => navigate(event, index)} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${active === index ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-primary"}`}>
            <Icon size={18} aria-hidden="true" />{label}
          </button>
        ))}
      </div>
      {tabs.map(({ id }, index) => (
        <div key={id} id={`settings-panel-${id}`} role="tabpanel" aria-labelledby={`settings-tab-${id}`} hidden={active !== index} tabIndex={0}>
          {index === 0 ? <InterviewPreferencesForm /> : index === 1 ? <LiveAudioSettings active={active === 1} /> : <AccountSettings user={user} active={active === 2} />}
        </div>
      ))}
    </div>
  );
}
