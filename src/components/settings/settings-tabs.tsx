"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { BookOpen, Mic, ShieldCheck } from "lucide-react";
import InterviewPreferencesForm from "./interview-preferences-form";

const tabs = [
  { id: "practice", label: "Luyện tập & Phỏng vấn", icon: BookOpen },
  { id: "live", label: "Phòng Live & Âm thanh", icon: Mic },
  { id: "account", label: "Tài khoản & Quyền riêng tư", icon: ShieldCheck },
] as const;

export default function SettingsTabs() {
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
      {tabs.map(({ id, label, icon: Icon }, index) => (
        <div key={id} id={`settings-panel-${id}`} role="tabpanel" aria-labelledby={`settings-tab-${id}`} hidden={active !== index} tabIndex={0}>
          {index === 0 ? <InterviewPreferencesForm /> : (
            <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
              <Icon size={28} className="mx-auto mb-4 text-slate-400" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-primary">{label}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{index === 1 ? "Tùy chọn giọng AI và kiểm tra micro sẽ được bổ sung ở giai đoạn tiếp theo." : "Các tùy chọn quản lý tài khoản và quyền riêng tư sẽ được bổ sung ở giai đoạn tiếp theo."}</p>
            </section>
          )}
        </div>
      ))}
    </div>
  );
}
