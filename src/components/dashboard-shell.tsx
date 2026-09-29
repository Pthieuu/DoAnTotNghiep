"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon, { type IconName } from "@/components/icon";

const navigation: { label: string; icon: IconName; anchor?: string; action?: string }[] = [
  { label: "Dashboard", icon: "home", anchor: "/dashboard" },
  { label: "My Profile", icon: "person", anchor: "#profile" },
  { label: "My CV", icon: "description", action: "my-cv" },
  { label: "Job Description", icon: "business_center", anchor: "#profile" },
  { label: "Interview Room", icon: "videocam", action: "interview-room" },
  { label: "Practice Weaknesses", icon: "track_changes", anchor: "#practice" },
  { label: "Interview History", icon: "history", anchor: "#history" },
  { label: "Progress & Analytics", icon: "trending_up", anchor: "#analytics" },
  { label: "Settings", icon: "settings_suggest", action: "settings" },
];

const previews: Record<string, { title: string; description: string }> = {
  "interview-room": { title: "Interview Preview", description: "Practice for a Web Engineer role at Rakuten with 6 questions in about 20 minutes. Your interviewer is Tanaka, Tech Lead. This is a demo; AI, camera, and microphone features are not connected." },
  "practice-weaknesses": { title: "Practice Preview", description: "Sample drills cover keigo (Japanese honorific language), particles, and structured answers using PREP. Voice practice is not connected in this demo." },
  "my-cv": { title: "CV Preview", description: "Phạm Trung Hiếu · VKU · JLPT N2. Sample experience: Laravel, Next.js, REST API design, and teamwork. Uploading and saving a CV are not available in this demo." },
  "job-description": { title: "Target Job · Rakuten Symphony", description: "Cloud Platform & Web Application Engineer. Sample requirements: PHP/Laravel or Go/Java, RDBMS, REST APIs, and business Japanese at N2 or above. Illustrative match score: 88%." },
  "interview-history": { title: "AI Report · Demo", description: "Sample feedback: Your technical explanations are well structured. Keep practicing keigo, particles, and questions for the interviewer. All dashboard scores are illustrative." },
  "progress-analytics": { title: "Learning Progress", description: "Your sample score increased from 62 to 82 over 5 practice sessions. Strengths: technical explanations and motivation. Next focus: communication and questions for the interviewer." },
  settings: { title: "Workspace Settings", description: "Sample profile: Phạm Trung Hiếu · VKU. Target: Backend & Full-Stack roles at Japanese companies. Settings changes are not saved in this demo." },
  notifications: { title: "Notifications", description: "Sample schedule: 6 days until your Rakuten interview. Today’s suggestion: spend 5 minutes reviewing particles and preparing questions for the interviewer." },
};

export default function DashboardShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [level, setLevel] = useState("N2");
  const [preview, setPreview] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const mobileClose = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (preview) dialog.current?.showModal();
  }, [preview]);

  useEffect(() => {
    if (!menuOpen) return;
    mobileClose.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuToggle.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
    menuToggle.current?.focus();
  }

  return (
    <div className="dashboard min-h-screen bg-surface text-body-md" onClick={(event) => {
      const action = (event.target as HTMLElement).closest<HTMLElement>("[data-mock]")?.dataset.mock;
      if (action) { setPreview(action); setMenuOpen(false); }
    }}>
      <a href="#dashboard-content" className="sr-only fixed top-2 left-2 z-[70] rounded bg-white p-3 focus:not-sr-only">Skip to dashboard</a>
      {menuOpen && <button type="button" aria-label="Close menu" onClick={closeMenu} className="fixed inset-0 z-40 bg-primary/40 lg:hidden" />}
      <aside id="dashboard-navigation" aria-label="Workspace navigation" className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-surface-container bg-white transition-transform ${menuOpen ? "visible translate-x-0" : "invisible -translate-x-full"} lg:visible lg:translate-x-0`}>
        <div className="flex h-20 shrink-0 items-center justify-between px-6">
          <Link href="/" aria-label="Aizuchi.AI — Home"><Image src="/logo.svg" alt="Aizuchi.AI" width={160} height={40} priority /></Link>
          <button ref={mobileClose} type="button" aria-label="Close menu" onClick={closeMenu} className="p-2 lg:hidden"><Icon name="close" /></button>
        </div>
        <div className="mx-5 border-t border-surface-container" />
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {navigation.map((item, index) => {
            const className = `flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[13px] transition-colors ${index === 0 ? "bg-primary-container font-semibold text-white" : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"}`;
            const content = <><span className="text-[20px]"><Icon name={item.icon} /></span><span>{item.label}</span>{item.action === "interview-room" && <span className="ml-auto rounded bg-secondary-fixed px-1.5 py-0.5 text-[9px] font-bold text-primary">DEMO</span>}</>;
            return item.anchor ? <Link key={item.label} href={item.anchor} aria-current={index === 0 ? "page" : undefined} onClick={() => setMenuOpen(false)} className={className}>{content}</Link> : <button key={item.label} type="button" data-mock={item.action} className={className}>{content}</button>;
          })}
        </nav>
        <div className="m-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-fixed font-semibold text-primary">H</span>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">Phạm Trung Hiếu</p><p className="mt-0.5 text-[10px] text-on-surface-variant">VKU · JLPT N2</p></div>
          <Link href="/login" aria-label="Leave demo and return to login" className="p-1.5 text-outline hover:text-error"><Icon name="logout" /></Link>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-surface-container bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button ref={menuToggle} type="button" aria-label="Open menu" aria-expanded={menuOpen} aria-controls="dashboard-navigation" onClick={() => setMenuOpen(!menuOpen)} className="p-2 lg:hidden"><Icon name="menu" /></button>
            <div className="flex items-center gap-1 text-xs text-on-surface-variant"><span>Console</span><Icon name="chevron_right" /><span className="font-semibold text-primary">Workspace</span></div>
            <span className="hidden rounded bg-surface-container-low px-2 py-1 text-[10px] text-on-surface-variant 2xl:inline">Target: Web Developer · Rakuten / LINE Yahoo! / Mercari</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div role="group" aria-label="Mock interview proficiency level" className="flex rounded-lg bg-surface-container-low p-1">{["N2", "N1"].map((item) => <button key={item} type="button" aria-pressed={level === item} onClick={() => setLevel(item)} className={`rounded px-2 py-1 text-[11px] ${level === item ? "bg-tertiary-fixed font-semibold text-tertiary" : "text-on-surface-variant"}`}>{item === "N2" ? "JLPT N2" : item}</button>)}</div>
            <button type="button" data-mock="interview-room" className="flex items-center gap-1.5 rounded bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-secondary"><Icon name="play_arrow" /><span className="hidden sm:inline">Start New Interview</span><span className="sm:hidden">Start</span></button>
            <button type="button" data-mock="notifications" aria-label="Notifications" className="relative p-2 text-lg text-on-surface-variant"><Icon name="notifications" /><span className="absolute top-1 right-1 size-1.5 rounded-full bg-error" /></button>
          </div>
        </header>
        <main id="dashboard-content" className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-variant"><span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-secondary" />Demo workspace · Sample data</span><span>Interview preset: JLPT {level}</span></div>
          {children}
        </main>
      </div>
      <dialog ref={dialog} onClose={() => setPreview(null)} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }} aria-labelledby="preview-title" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-6 text-on-surface shadow-xl backdrop:bg-primary/50">
        <div className="flex items-start justify-between gap-4"><h2 id="preview-title" className="text-lg font-semibold text-primary">{preview && previews[preview]?.title}</h2><button type="button" aria-label="Close" onClick={() => dialog.current?.close()} className="rounded p-2 hover:bg-surface-container-low"><Icon name="close" /></button></div>
        <p className="mt-3 text-sm leading-7 text-on-surface-variant">{preview && previews[preview]?.description}</p>
        {preview === "interview-room" && <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-sm">Selected level: <strong>JLPT {level}</strong></p>}
        <form method="dialog" className="mt-6 flex justify-end"><button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Got It</button></form>
      </dialog>
    </div>
  );
}
