"use client";

import { useEffect, useState, type ReactNode } from "react";
import Icon, { type IconName } from "@/components/icon";
import DashboardShell from "@/components/dashboard-shell";
import type { AuthUser } from "@/lib/auth-types";

type Profile = {
  fullName: string;
  katakana: string;
  email: string;
  phone: string;
  summary: string;
  target: string;
  motivation: string;
};

type StoredProfile = { full_name: string; katakana: string; phone: string; summary: string; target: string; motivation: string; jlpt_level: string; employment_status: "student" | "working" };

const sampleProfile: Profile = {
  fullName: "Phạm Trung Hiếu",
  katakana: "ファム・チュン・ヒエウ",
  email: "hieu.pham@vku.udn.vn",
  phone: "+84 905 123 456",
  summary: "Sinh viên năm cuối ngành Khoa học Máy tính, có 9 tháng thực tập Web Backend (Laravel/MySQL). Đạt chứng chỉ JLPT N2 và có kinh nghiệm làm việc nhóm với kỹ sư Nhật Bản.",
  target: "Web Application Engineer / Backend Developer",
  motivation: "Tôi ấn tượng với văn hóa Kaizen, tinh thần Monozukuri và quy trình review cẩn trọng tại các công ty Nhật. Tôi mong muốn phát triển kỹ năng thiết kế hệ thống và đóng góp vai trò cầu nối công nghệ giữa kỹ sư Việt Nam và Nhật Bản.",
};

function ProfileField({ label, value, onChange, multiline = false, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; readOnly?: boolean }) {
  const className = "w-full rounded-lg border border-outline-variant/70 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15";
  return <label className="flex min-w-0 flex-col gap-1.5"><span className="text-xs font-semibold text-on-surface-variant">{label}</span>{multiline ? <textarea readOnly={readOnly} rows={4} value={value} onChange={(event) => onChange(event.target.value)} className={`${className} resize-y leading-6`} /> : <input readOnly={readOnly} value={value} onChange={(event) => onChange(event.target.value)} className={`${className} ${readOnly ? "cursor-not-allowed bg-surface-container-low" : ""}`} />}</label>;
}

function Section({ icon, title, subtitle, children }: { icon: IconName; title: string; subtitle: string; children: ReactNode }) {
  return <section className="rounded-xl border border-outline-variant/50 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center gap-3 border-b border-surface-container pb-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary"><Icon name={icon} /></span><div><h2 className="text-sm font-bold text-primary sm:text-base">{title}</h2><p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p></div></div>{children}</section>;
}

function InfoCard({ icon, title, subtitle, tags }: { icon: IconName; title: string; subtitle: string; tags?: string[] }) {
  return <article className="flex gap-3 rounded-lg border border-outline-variant/50 bg-surface-container-low/50 p-3.5"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant/50 bg-white text-primary"><Icon name={icon} /></span><div className="min-w-0"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-on-surface-variant">{subtitle}</p>{tags && <div className="mt-2 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="rounded-md border border-outline-variant/50 bg-white px-2 py-1 text-[11px] text-on-surface-variant">{tag}</span>)}</div>}</div></article>;
}

export default function ProfileEditor({ user }: { user: AuthUser }) {
  const [profile, setProfile] = useState<Profile>({ ...sampleProfile, fullName: user.name, email: user.email });
  const [savedProfile, setSavedProfile] = useState(profile);
  const [isSaved, setIsSaved] = useState(false);
  const [status, setStatus] = useState<"student" | "working">("student");
  const [level, setLevel] = useState("N2");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof Profile, value: string) => { setProfile((current) => ({ ...current, [key]: value })); setIsSaved(false); setError(""); };
  const completion = Math.round(Object.values(profile).filter(Boolean).length / Object.keys(profile).length * 100);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then(async (response) => {
        if (!response.ok) throw new Error("Không thể tải hồ sơ từ cơ sở dữ liệu.");
        return response.json() as Promise<{ profile: StoredProfile | null }>;
      })
      .then(({ profile: stored }) => {
        if (cancelled || !stored) return;
        const loaded: Profile = { fullName: stored.full_name, katakana: stored.katakana, email: user.email, phone: stored.phone, summary: stored.summary, target: stored.target, motivation: stored.motivation };
        setProfile(loaded);
        setSavedProfile(loaded);
        setLevel(stored.jlpt_level);
        setStatus(stored.employment_status);
      })
      .catch((loadError: unknown) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Không thể tải hồ sơ."); });
    return () => { cancelled = true; };
  }, [user.email]);

  async function saveProfile() {
    setIsSaving(true);
    setError("");
    setIsSaved(false);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, jlptLevel: level, employmentStatus: status }),
      });
      const result = await response.json() as { error?: string; profile?: StoredProfile };
      if (!response.ok || !result.profile) throw new Error(result.error || "Không thể lưu hồ sơ.");
      const stored = result.profile;
      const updated: Profile = { fullName: stored.full_name, katakana: stored.katakana, email: user.email, phone: stored.phone, summary: stored.summary, target: stored.target, motivation: stored.motivation };
      setProfile(updated);
      setSavedProfile(updated);
      setLevel(stored.jlpt_level);
      setStatus(stored.employment_status);
      setIsSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu hồ sơ.");
    } finally {
      setIsSaving(false);
    }
  }

  return <DashboardShell user={user} activePage="My Profile">
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <section className="rounded-xl border border-outline-variant/50 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-center gap-4"><div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-white ring-4 ring-surface-container-low">{profile.fullName.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase()}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold tracking-tight text-primary">{profile.fullName}</h1><span lang="ja" className="text-xs text-on-surface-variant">({profile.katakana})</span></div><p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant"><span className="inline-flex items-center gap-1"><Icon name="work_outline" />Web Developer / Backend Engineer</span><span>·</span><span className="inline-flex items-center gap-1"><Icon name="location_on" />Đà Nẵng, Việt Nam</span></p><div role="group" aria-label="Tình trạng nghề nghiệp" className="mt-3 inline-flex rounded-full border border-outline-variant/60 bg-surface-container-low p-0.5"><button type="button" aria-pressed={status === "student"} onClick={() => setStatus("student")} className={`rounded-full px-3 py-1 text-[11px] ${status === "student" ? "bg-white font-semibold text-primary shadow-sm" : "text-on-surface-variant"}`}>Sinh viên · VKU năm 4</button><button type="button" aria-pressed={status === "working"} onClick={() => setStatus("working")} className={`rounded-full px-3 py-1 text-[11px] ${status === "working" ? "bg-white font-semibold text-primary shadow-sm" : "text-on-surface-variant"}`}>Đã đi làm</button></div></div></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => { setProfile(savedProfile); setIsSaved(false); setError(""); }} disabled={isSaving} className="rounded-lg border border-outline-variant/70 px-3.5 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50">Hoàn tác</button><button type="button" onClick={saveProfile} disabled={isSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-container disabled:cursor-wait disabled:opacity-60"><Icon name="save" />{isSaving ? "Đang lưu..." : isSaved ? "Đã lưu" : "Lưu thay đổi"}</button></div></div>
        <div className="mt-5 border-t border-surface-container pt-4"><div className="flex justify-between text-xs"><span className="text-on-surface-variant">Mức độ hoàn thiện hồ sơ</span><span className="font-semibold text-emerald-700">{completion}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-emerald-600 transition-[width]" style={{ width: `${completion}%` }} /></div></div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12"><div className="flex flex-col gap-5 lg:col-span-7">
        <Section icon="person" title="Thông tin cơ bản" subtitle="Thông tin nhận diện và cách AI xưng hô"><div className="grid gap-4 sm:grid-cols-2"><ProfileField label="Họ và tên" value={profile.fullName} onChange={(v) => set("fullName", v)} /><ProfileField label="Tên phiên âm Katakana" value={profile.katakana} onChange={(v) => set("katakana", v)} /><ProfileField label="Email tài khoản" value={profile.email} onChange={() => undefined} readOnly /><ProfileField label="Số điện thoại" value={profile.phone} onChange={(v) => set("phone", v)} /><div className="sm:col-span-2"><ProfileField label="Giới thiệu bản thân" value={profile.summary} onChange={(v) => set("summary", v)} multiline /></div></div></Section>
        <Section icon="target" title="Mục tiêu nghề nghiệp" subtitle="Định hướng ứng tuyển và lý do làm việc tại Nhật"><div className="space-y-4"><ProfileField label="Vị trí ứng tuyển mục tiêu" value={profile.target} onChange={(v) => set("target", v)} /><div><p className="text-xs font-semibold text-on-surface-variant">Lĩnh vực quan tâm</p><div className="mt-2 flex flex-wrap gap-2">{[["shopping_bag", "Thương mại điện tử"], ["payments", "FinTech & thanh toán"], ["cloud", "Cloud / Microservices"]].map(([icon, label]) => <span key={label} className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant/60 bg-surface-container-low px-2.5 py-1.5 text-xs text-on-surface-variant"><Icon name={icon as IconName} />{label}</span>)}</div></div><ProfileField label="Lý do muốn làm việc tại Nhật Bản" value={profile.motivation} onChange={(v) => set("motivation", v)} multiline /></div></Section>
        <Section icon="school" title="Học vấn & kinh nghiệm thực tế" subtitle="Học tập, thực tập và dự án tiêu biểu"><div className="space-y-3"><InfoCard icon="history_edu" title="Đại học Công nghệ Thông tin & Truyền thông Việt - Hàn (VKU)" subtitle="Kỹ sư Khoa học Máy tính · GPA 3.62 / 4.0 · 2021—2025" /><InfoCard icon="domain" title="Thực tập sinh Backend Developer · Da Nang Tech Partner" subtitle="10/2023—06/2024 · Xây dựng module thanh toán, REST API với Laravel và Docker." /><InfoCard icon="deployed_code" title="EC Webhook & 3D Secure 2.0" subtitle="Thiết kế webhook thanh toán an toàn, xử lý idempotent transaction và tối ưu MySQL." tags={["Laravel 10", "MySQL", "Redis", "Docker"]} /></div><button type="button" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-secondary"><Icon name="add" />Thêm học vấn hoặc kinh nghiệm</button></Section>
      </div><div className="flex flex-col gap-5 lg:col-span-5">
        <Section icon="translate" title="Năng lực ngôn ngữ" subtitle="Cơ sở điều chỉnh tốc độ và từ vựng"><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant/50 bg-surface-container-low p-3"><div><p className="text-sm font-bold">JLPT {level}{level === "N2" ? " · 128 / 180" : ""}</p><p className="mt-1 text-xs text-on-surface-variant">{level === "N2" ? "Đã cấp chứng chỉ · 12/2023" : "Mức độ luyện tập được chọn"}</p></div><label className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">Trình độ<select aria-label="Chọn trình độ JLPT" value={level} onChange={(event) => setLevel(event.target.value)} className="rounded-md border border-outline-variant/70 bg-white px-2 py-1.5 text-xs font-semibold text-primary outline-none focus:border-secondary">{["N5", "N4", "N3", "N2", "N1"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div><div className="mt-3 space-y-2">{[["Giao tiếp thường nhật", "Lưu loát"], ["Thuật ngữ CNTT", "Khá"], ["Kính ngữ thương mại", "Đang rèn luyện"], ["Tiếng Anh", "TOEIC 785"]].map(([label, value]) => <div key={label} className="flex justify-between gap-2 rounded-md border border-outline-variant/50 px-3 py-2 text-xs"><span className="text-on-surface-variant">{label}</span><span className="font-semibold">{value}</span></div>)}</div></Section>
        <Section icon="terminal" title="Kỹ năng công nghệ" subtitle="Công nghệ bạn có thể trao đổi trong phỏng vấn"><div className="flex flex-wrap gap-2">{["Laravel · 2 năm", "TypeScript / Next.js", "MySQL", "Docker", "Git & GitHub Actions"].map((skill) => <span key={skill} className="rounded-lg border border-outline-variant/50 bg-surface-container-low px-2.5 py-2 text-xs">{skill}</span>)}</div><p className="mt-3 text-[11px] leading-5 text-outline">AI sẽ dựa trên các kỹ năng đã chọn để đặt câu hỏi chuyên sâu.</p></Section>
        <section className="rounded-xl bg-gradient-to-br from-primary to-primary-container p-5 text-white"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-white/10 text-tertiary-fixed"><Icon name="videocam" /></span><div><h2 className="text-sm font-semibold">Sẵn sàng cho buổi phỏng vấn?</h2><p className="mt-1 text-xs leading-5 text-primary-fixed-dim">Dùng hồ sơ này để cá nhân hóa câu hỏi luyện tập.</p></div></div><button type="button" data-mock="interview-room" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-primary">Thiết lập buổi phỏng vấn <Icon name="arrow_forward" /></button></section>
      </div></div>
      {error && <div role="alert" className="fixed bottom-5 right-5 z-40 max-w-sm rounded-lg border border-error/30 bg-white px-4 py-3 text-xs font-medium text-error shadow-xl">{error}</div>}
      {isSaved && <div role="status" className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-xs font-medium text-white shadow-xl"><Icon name="check_circle" />Hồ sơ đã được lưu vào tài khoản của bạn.</div>}
    </div>
  </DashboardShell>;
}
