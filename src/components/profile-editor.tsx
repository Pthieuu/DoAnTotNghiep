"use client";

import { useEffect, useState, type ReactNode } from "react";
import Icon, { type IconName } from "@/components/icon";
import Link from "next/link";
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
  industries: string[];
  languages: { name: string; level: string; details: string }[];
  educationExperience: { type: string; title: string; organization: string; period: string; details: string }[];
  technicalSkills: { name: string; details: string }[];
};

type StoredProfile = { full_name: string; katakana: string; phone: string; summary: string; target: string; motivation: string; jlpt_level: string; employment_status: "student" | "working"; industries: string[]; languages: Profile["languages"]; education_experience: Profile["educationExperience"]; technical_skills: Profile["technicalSkills"] };

const sampleProfile: Profile = {
  fullName: "Phạm Trung Hiếu",
  katakana: "ファム・チュン・ヒエウ",
  email: "hieu.pham@vku.udn.vn",
  phone: "+84 905 123 456",
  summary: "Sinh viên năm cuối ngành Khoa học Máy tính, có 9 tháng thực tập Web Backend (Laravel/MySQL). Đạt chứng chỉ JLPT N2 và có kinh nghiệm làm việc nhóm với kỹ sư Nhật Bản.",
  target: "Web Application Engineer / Backend Developer",
  motivation: "Tôi ấn tượng với văn hóa Kaizen, tinh thần Monozukuri và quy trình review cẩn trọng tại các công ty Nhật. Tôi mong muốn phát triển kỹ năng thiết kế hệ thống và đóng góp vai trò cầu nối công nghệ giữa kỹ sư Việt Nam và Nhật Bản.",
  industries: ["Thương mại điện tử", "FinTech & thanh toán", "Cloud / Microservices"],
  languages: [{ name: "Tiếng Nhật", level: "JLPT N2", details: "128/180 · 12/2023" }, { name: "Tiếng Anh", level: "TOEIC 785", details: "" }, { name: "Tiếng Việt", level: "Bản ngữ", details: "" }],
  educationExperience: [
    { type: "Học vấn", title: "Kỹ sư Khoa học Máy tính", organization: "Đại học Công nghệ Thông tin & Truyền thông Việt - Hàn (VKU)", period: "2021—2025", details: "GPA 3.62 / 4.0" },
    { type: "Kinh nghiệm", title: "Thực tập sinh Backend Developer", organization: "Da Nang Tech Partner", period: "10/2023—06/2024", details: "Xây dựng module thanh toán, REST API với Laravel và Docker." },
    { type: "Dự án", title: "EC Webhook & 3D Secure 2.0", organization: "Trưởng nhóm Backend", period: "", details: "Thiết kế webhook thanh toán an toàn, idempotent transaction và tối ưu MySQL." },
  ],
  technicalSkills: [{ name: "Laravel", details: "2 năm" }, { name: "TypeScript / Next.js", details: "" }, { name: "MySQL", details: "" }, { name: "Docker", details: "" }, { name: "Git & GitHub Actions", details: "" }],
};

function ProfileField({ label, value, onChange, multiline = false, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; readOnly?: boolean }) {
  const className = "w-full rounded-lg border border-outline-variant/70 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15";
  return <label className="flex min-w-0 flex-col gap-1.5"><span className="text-xs font-semibold text-on-surface-variant">{label}</span>{multiline ? <textarea readOnly={readOnly} rows={4} value={value} onChange={(event) => onChange(event.target.value)} className={`${className} resize-y leading-6`} /> : <input readOnly={readOnly} value={value} onChange={(event) => onChange(event.target.value)} className={`${className} ${readOnly ? "cursor-not-allowed bg-surface-container-low" : ""}`} />}</label>;
}

function Section({ icon, title, subtitle, children }: { icon: IconName; title: string; subtitle: string; children: ReactNode }) {
  return <section className="rounded-xl border border-outline-variant/50 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center gap-3 border-b border-surface-container pb-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary"><Icon name={icon} /></span><div><h2 className="text-sm font-bold text-primary sm:text-base">{title}</h2><p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p></div></div>{children}</section>;
}

function ListEditor({ rows, fields, onChange, onRemove, onAdd, addLabel }: { rows: Record<string, string>[]; fields: { key: string; label: string }[]; onChange: (index: number, key: string, value: string) => void; onRemove: (index: number) => void; onAdd: () => void; addLabel: string }) {
  return <div className="space-y-3">{rows.map((row, index) => <div key={index} className="rounded-lg border border-outline-variant/50 bg-surface-container-low/40 p-3"><div className="grid gap-3 sm:grid-cols-2">{fields.map((field) => <label key={field.key} className="flex min-w-0 flex-col gap-1"><span className="text-[11px] font-medium text-on-surface-variant">{field.label}</span><input value={row[field.key] || ""} onChange={(event) => onChange(index, field.key, event.target.value)} className="w-full rounded-md border border-outline-variant/60 bg-white px-2.5 py-2 text-xs outline-none focus:border-secondary" /></label>)}</div><button type="button" onClick={() => onRemove(index)} className="mt-2 text-[11px] font-medium text-error hover:underline">Xóa mục</button></div>)}<button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-xs font-semibold text-secondary"><Icon name="add" />{addLabel}</button></div>;
}

export default function ProfileEditor({ user }: { user: AuthUser }) {
  const [profile, setProfile] = useState<Profile>({ ...sampleProfile, fullName: user.name, email: user.email });
  const [savedProfile, setSavedProfile] = useState(profile);
  const [isSaved, setIsSaved] = useState(false);
  const [status, setStatus] = useState<"student" | "working">("student");
  const [level, setLevel] = useState("N2");
  const [savedStatus, setSavedStatus] = useState<"student" | "working">("student");
  const [savedLevel, setSavedLevel] = useState("N2");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key: keyof Profile, value: string) => { setProfile((current) => ({ ...current, [key]: value })); setIsSaved(false); setError(""); };
  const completion = Math.round(Object.values(profile).filter(Boolean).length / Object.keys(profile).length * 100);
  function updateArray<K extends "languages" | "educationExperience" | "technicalSkills">(key: K, index: number, field: keyof Profile[K][number], value: string) {
    setProfile((current) => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
    setIsSaved(false);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then(async (response) => {
        const result = await response.json() as { profile?: StoredProfile | null; error?: string };
        if (!response.ok) throw new Error(result.error || "Không thể tải hồ sơ từ cơ sở dữ liệu.");
        return result as { profile: StoredProfile | null };
      })
      .then(({ profile: stored }) => {
        if (cancelled || !stored) return;
        const loaded: Profile = { fullName: stored.full_name, katakana: stored.katakana, email: user.email, phone: stored.phone, summary: stored.summary, target: stored.target, motivation: stored.motivation, industries: stored.industries || [], languages: stored.languages || [], educationExperience: stored.education_experience || [], technicalSkills: stored.technical_skills || [] };
        setProfile(loaded);
        setSavedProfile(loaded);
        setLevel(stored.jlpt_level);
        setStatus(stored.employment_status);
        setSavedLevel(stored.jlpt_level);
        setSavedStatus(stored.employment_status);
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
      const updated: Profile = { fullName: stored.full_name, katakana: stored.katakana, email: user.email, phone: stored.phone, summary: stored.summary, target: stored.target, motivation: stored.motivation, industries: stored.industries || [], languages: stored.languages || [], educationExperience: stored.education_experience || [], technicalSkills: stored.technical_skills || [] };
      setProfile(updated);
      setSavedProfile(updated);
      setLevel(stored.jlpt_level);
      setStatus(stored.employment_status);
      setSavedLevel(stored.jlpt_level);
      setSavedStatus(stored.employment_status);
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
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex min-w-0 items-center gap-4"><div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-white ring-4 ring-surface-container-low">{profile.fullName.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase()}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold tracking-tight text-primary">{profile.fullName}</h1><span lang="ja" className="text-xs text-on-surface-variant">({profile.katakana})</span></div><p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant"><span className="inline-flex items-center gap-1"><Icon name="work_outline" />{profile.target}</span><span>·</span><span className="inline-flex items-center gap-1"><Icon name="location_on" />Đà Nẵng, Việt Nam</span></p><div role="group" aria-label="Tình trạng nghề nghiệp" className="mt-3 inline-flex rounded-full border border-outline-variant/60 bg-surface-container-low p-0.5"><button type="button" aria-pressed={status === "student"} onClick={() => setStatus("student")} className={`rounded-full px-3 py-1 text-[11px] ${status === "student" ? "bg-white font-semibold text-primary shadow-sm" : "text-on-surface-variant"}`}>Sinh viên</button><button type="button" aria-pressed={status === "working"} onClick={() => setStatus("working")} className={`rounded-full px-3 py-1 text-[11px] ${status === "working" ? "bg-white font-semibold text-primary shadow-sm" : "text-on-surface-variant"}`}>Đã đi làm</button></div></div></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => { setProfile(savedProfile); setLevel(savedLevel); setStatus(savedStatus); setIsSaved(false); setError(""); }} disabled={isSaving} className="rounded-lg border border-outline-variant/70 px-3.5 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50">Hoàn tác</button><button type="button" onClick={saveProfile} disabled={isSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-container disabled:cursor-wait disabled:opacity-60"><Icon name="save" />{isSaving ? "Đang lưu..." : isSaved ? "Đã lưu" : "Lưu thay đổi"}</button></div></div>
        <div className="mt-5 border-t border-surface-container pt-4"><div className="flex justify-between text-xs"><span className="text-on-surface-variant">Mức độ hoàn thiện hồ sơ</span><span className="font-semibold text-emerald-700">{completion}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container"><div className="h-full rounded-full bg-emerald-600 transition-[width]" style={{ width: `${completion}%` }} /></div></div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12"><div className="flex flex-col gap-5 lg:col-span-7">
        <Section icon="person" title="Thông tin cơ bản" subtitle="Thông tin nhận diện và cách AI xưng hô"><div className="grid gap-4 sm:grid-cols-2"><ProfileField label="Họ và tên" value={profile.fullName} onChange={(v) => set("fullName", v)} /><ProfileField label="Tên phiên âm Katakana" value={profile.katakana} onChange={(v) => set("katakana", v)} /><ProfileField label="Email tài khoản" value={profile.email} onChange={() => undefined} readOnly /><ProfileField label="Số điện thoại" value={profile.phone} onChange={(v) => set("phone", v)} /><div className="sm:col-span-2"><ProfileField label="Giới thiệu bản thân" value={profile.summary} onChange={(v) => set("summary", v)} multiline /></div></div></Section>
        <Section icon="target" title="Mục tiêu nghề nghiệp" subtitle="Định hướng ứng tuyển và lý do làm việc tại Nhật"><div className="space-y-4"><ProfileField label="Vị trí ứng tuyển mục tiêu" value={profile.target} onChange={(v) => set("target", v)} /><div><p className="mb-2 text-xs font-semibold text-on-surface-variant">Lĩnh vực quan tâm</p><textarea rows={2} value={profile.industries.join(", ")} onChange={(event) => { setProfile((current) => ({ ...current, industries: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })); setIsSaved(false); }} placeholder="Ví dụ: FinTech, Thương mại điện tử" className="w-full rounded-lg border border-outline-variant/70 bg-white px-3 py-2.5 text-sm outline-none focus:border-secondary" /><p className="mt-1 text-[11px] text-outline">Phân tách các lĩnh vực bằng dấu phẩy.</p></div><ProfileField label="Lý do muốn làm việc tại Nhật Bản" value={profile.motivation} onChange={(v) => set("motivation", v)} multiline /></div></Section>
        <Section icon="school" title="Học vấn & kinh nghiệm thực tế" subtitle="Thêm, sửa hoặc xóa các mục trong hồ sơ"><ListEditor rows={profile.educationExperience} fields={[{ key: "type", label: "Loại mục" }, { key: "title", label: "Chức danh / bằng cấp / dự án" }, { key: "organization", label: "Trường học / tổ chức" }, { key: "period", label: "Thời gian" }, { key: "details", label: "Mô tả / thành tích" }]} onChange={(i, key, value) => updateArray("educationExperience", i, key as keyof Profile["educationExperience"][number], value)} onRemove={(index) => setProfile((current) => ({ ...current, educationExperience: current.educationExperience.filter((_, i) => i !== index) }))} onAdd={() => setProfile((current) => ({ ...current, educationExperience: [...current.educationExperience, { type: "Kinh nghiệm", title: "", organization: "", period: "", details: "" }] }))} addLabel="Thêm học vấn / kinh nghiệm / dự án" /></Section>
      </div><div className="flex flex-col gap-5 lg:col-span-5">
        <Section icon="translate" title="Năng lực ngôn ngữ" subtitle="Thêm ngôn ngữ, trình độ và chứng chỉ"><ListEditor rows={profile.languages} fields={[{ key: "name", label: "Ngôn ngữ" }, { key: "level", label: "Trình độ / chứng chỉ" }, { key: "details", label: "Điểm số / ghi chú" }]} onChange={(i, key, value) => updateArray("languages", i, key as keyof Profile["languages"][number], value)} onRemove={(index) => setProfile((current) => ({ ...current, languages: current.languages.filter((_, i) => i !== index) }))} onAdd={() => setProfile((current) => ({ ...current, languages: [...current.languages, { name: "", level: "", details: "" }] }))} addLabel="Thêm ngôn ngữ" /><label className="mt-3 flex items-center gap-2 text-xs font-medium text-on-surface-variant">Mức JLPT<select aria-label="Chọn mức luyện tập JLPT" value={level} onChange={(event) => setLevel(event.target.value)} className="rounded-md border border-outline-variant/70 bg-white px-2 py-1.5 text-xs font-semibold text-primary">{["N5", "N4", "N3", "N2", "N1"].map((item) => <option key={item}>{item}</option>)}</select></label></Section>
        <Section icon="terminal" title="Kỹ năng công nghệ" subtitle="Chọn công nghệ để AI cá nhân hóa phỏng vấn"><ListEditor rows={profile.technicalSkills} fields={[{ key: "name", label: "Kỹ năng / công nghệ" }, { key: "details", label: "Kinh nghiệm / ghi chú" }]} onChange={(i, key, value) => updateArray("technicalSkills", i, key as keyof Profile["technicalSkills"][number], value)} onRemove={(index) => setProfile((current) => ({ ...current, technicalSkills: current.technicalSkills.filter((_, i) => i !== index) }))} onAdd={() => setProfile((current) => ({ ...current, technicalSkills: [...current.technicalSkills, { name: "", details: "" }] }))} addLabel="Thêm kỹ năng" /></Section>
        <section className="rounded-xl bg-gradient-to-br from-primary to-primary-container p-5 text-white"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-lg bg-white/10 text-tertiary-fixed"><Icon name="videocam" /></span><div><h2 className="text-sm font-semibold">Sẵn sàng cho buổi phỏng vấn?</h2><p className="mt-1 text-xs leading-5 text-primary-fixed-dim">Dùng hồ sơ này để cá nhân hóa câu hỏi luyện tập.</p></div></div><Link href="/interview-setup" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-primary">Thiết lập buổi phỏng vấn <Icon name="arrow_forward" /></Link></section>
      </div></div>
      {error && <div role="alert" className="fixed bottom-5 right-5 z-40 max-w-sm rounded-lg border border-error/30 bg-white px-4 py-3 text-xs font-medium text-error shadow-xl">{error}</div>}
      {isSaved && <div role="status" className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-xs font-medium text-white shadow-xl"><Icon name="check_circle" />Hồ sơ đã được lưu vào tài khoản của bạn.</div>}
    </div>
  </DashboardShell>;
}
