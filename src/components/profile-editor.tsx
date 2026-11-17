"use client";

import { useEffect, useState, type ReactNode } from "react";
import Icon, { type IconName } from "@/components/icon";
import Link from "next/link";
import DashboardShell from "@/components/dashboard-shell";
import type { AuthUser } from "@/lib/auth-types";
import ProfileListCards from "@/components/profile-list-cards";

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

const emptyProfile: Profile = { fullName: "", katakana: "", email: "", phone: "", summary: "", target: "", motivation: "", industries: [], languages: [], educationExperience: [], technicalSkills: [] };

function ProfileField({ label, value, onChange, multiline = false, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; readOnly?: boolean }) {
  const className = "w-full rounded-lg border border-outline-variant/70 bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15";
  return <label className="flex min-w-0 flex-col gap-1.5"><span className="text-xs font-semibold text-on-surface-variant">{label}</span>{multiline ? <textarea readOnly={readOnly} rows={3} value={value} onChange={(event) => onChange(event.target.value)} className={`${className} resize-y leading-6`} /> : <input readOnly={readOnly} value={value} onChange={(event) => onChange(event.target.value)} className={`${className} ${readOnly ? "cursor-not-allowed bg-surface-container-low" : ""}`} />}</label>;
}

function Section({ icon, title, subtitle, children }: { icon: IconName; title: string; subtitle: string; children: ReactNode }) {
  return <section className="rounded-xl border border-outline-variant/50 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center gap-3 border-b border-surface-container pb-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary"><Icon name={icon} /></span><div><h2 className="text-sm font-bold text-primary sm:text-base">{title}</h2><p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p></div></div>{children}</section>;
}

export default function ProfileEditor({ user }: { user: AuthUser }) {
  const [profile, setProfile] = useState<Profile>({ ...emptyProfile, fullName: user.name, email: user.email });
  const [savedProfile, setSavedProfile] = useState(profile);
  const [isSaved, setIsSaved] = useState(false);
  const [status, setStatus] = useState<"student" | "working">("student");
  const [level, setLevel] = useState("N2");
  const [savedStatus, setSavedStatus] = useState<"student" | "working">("student");
  const [savedLevel, setSavedLevel] = useState("N2");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const set = (key: keyof Profile, value: string) => { setProfile((current) => ({ ...current, [key]: value })); setIsSaved(false); setError(""); };
  const completionItems = [
    { label: "Basic Info", done: [profile.fullName, profile.katakana, profile.email, profile.phone].every(value => value.trim()) },
    { label: "Introduction", done: !!profile.summary.trim() },
    { label: "Career Goals", done: !!profile.target.trim() && !!profile.motivation.trim() },
    { label: "Industries", done: profile.industries.some(value => value.trim()) },
    { label: "Languages", done: profile.languages.some(item => item.name.trim() && item.level.trim()) },
    { label: "Education / Experience", done: profile.educationExperience.some(item => item.title.trim() && item.organization.trim()) },
    { label: "Technical Skills", done: profile.technicalSkills.some(item => item.name.trim()) },
  ];
  const completion = Math.round(completionItems.filter(item => item.done).length / completionItems.length * 100);
  const isDirty = JSON.stringify(profile) !== JSON.stringify(savedProfile) || status !== savedStatus || level !== savedLevel;
  const disabled = isLoading || isSaving || loadFailed;
  function changeList<K extends "languages" | "educationExperience" | "technicalSkills">(key: K, rows: Profile[K]) {
    setProfile(current => ({ ...current, [key]: rows }));
    setIsSaved(false);
    setError("");
  }
  function updateArray<K extends "languages" | "educationExperience" | "technicalSkills">(key: K, index: number, field: keyof Profile[K][number], value: string) {
    setProfile((current) => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }));
    setIsSaved(false);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then(async (response) => {
        const result = await response.json() as { profile?: StoredProfile | null; error?: string };
        if (!response.ok) throw new Error(result.error || "Could not load profile from database.");
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
      .catch((loadError: unknown) => { if (!cancelled) { setError(loadError instanceof Error ? loadError.message : "Could not load profile."); setLoadFailed(true); } })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [user.email]);

  async function saveProfile() {
    if (disabled) return;
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
      if (!response.ok || !result.profile) throw new Error(result.error || "Could not save profile.");
      const stored = result.profile;
      const updated: Profile = { fullName: stored.full_name, katakana: stored.katakana, email: user.email, phone: stored.phone, summary: stored.summary, target: stored.target, motivation: stored.motivation, industries: stored.industries || [], languages: stored.languages || [], educationExperience: stored.education_experience || [], technicalSkills: stored.technical_skills || [] };
      setProfile(updated);
      setSavedProfile(updated);
      setLevel(stored.jlpt_level);
      setStatus(stored.employment_status);
      setSavedLevel(stored.jlpt_level);
      setSavedStatus(stored.employment_status);
      setIsSaved(true);
      setRevision(current => current + 1);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save profile.");
    } finally {
      setIsSaving(false);
    }
  }

  function undoChanges() {
    setProfile(savedProfile);
    setLevel(savedLevel);
    setStatus(savedStatus);
    setIsSaved(false);
    setError("");
    setRevision(current => current + 1);
  }

  return <DashboardShell user={user} activePage="My Profile">
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-6">
      <header className="overflow-hidden rounded-2xl border border-outline-variant/50 bg-white shadow-sm">
        <div className="h-2 bg-gradient-to-r from-primary via-secondary to-emerald-500" />
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-white sm:size-20">{profile.fullName.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() || "?"}</div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary">My Profile</p>
              <h1 className="mt-1 break-words text-xl font-bold text-primary sm:text-2xl">{profile.fullName || "Personal Profile"}</h1>
              {profile.katakana && <p lang="ja" className="mt-1 text-sm text-on-surface-variant">{profile.katakana}</p>}
              <p className="mt-1 break-words text-sm text-on-surface-variant">{profile.target || "Add your career goals"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span role="status" className="mr-1 text-xs text-on-surface-variant">{isLoading ? "Loading profile..." : loadFailed ? "Failed to load profile" : isSaving ? "Saving..." : isDirty ? "Unsaved changes" : "Synchronized"}</span>
            <button type="button" onClick={undoChanges} disabled={disabled || !isDirty} className="rounded-xl border border-outline-variant/70 px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40">Undo</button>
            <button type="button" onClick={saveProfile} disabled={disabled || !isDirty} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-40"><Icon name="save" />{isSaving ? "Saving..." : "Save Changes"}</button>
          </div>
        </div>
        <div className="border-t border-emerald-100 bg-emerald-50/60 p-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold text-primary">Profile Completeness</h2><p className="mt-1 text-xs text-on-surface-variant">{completionItems.filter(item => item.done).length}/{completionItems.length} categories completed</p></div>
            <span className="text-3xl font-bold tabular-nums text-emerald-700">{isLoading ? "—" : `${completion}%`}</span>
          </div>
          <div role="progressbar" aria-label="Profile Completeness" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-2.5 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-600 transition-[width]" style={{ width: `${completion}%` }} /></div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">{completionItems.map(item => <li key={item.label} className={`inline-flex items-center gap-1.5 text-xs ${item.done ? "text-emerald-800" : "text-on-surface-variant"}`}>{item.done ? <Icon name="check_circle" /> : <span aria-hidden="true" className="size-3 rounded-full border border-current" />}<span>{item.label}<span className="sr-only">{item.done ? ": completed" : ": not completed"}</span></span></li>)}</ul>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-error/20 bg-error-container p-4 text-sm text-on-error-container">{error}{loadFailed && <p className="mt-2">Please reload the page to load your profile before editing.</p>}</div>}
      {isSaved && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><Icon name="check_circle" />Profile has been saved to your account.</p>}

      <fieldset disabled={disabled} className="min-w-0 space-y-5 disabled:opacity-70">
        <legend className="sr-only">Edit Personal Profile</legend>
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <div className="min-w-0 space-y-5">
            <Section icon="person" title="Basic Information" subtitle="Identity and contact information">
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileField label="Full Name" value={profile.fullName} onChange={value => set("fullName", value)} />
                <ProfileField label="Katakana Name" value={profile.katakana} onChange={value => set("katakana", value)} />
                <ProfileField label="Account Email" value={profile.email} onChange={() => undefined} readOnly />
                <ProfileField label="Phone Number" value={profile.phone} onChange={value => set("phone", value)} />
                <div className="sm:col-span-2"><ProfileField label="Self Introduction" value={profile.summary} onChange={value => set("summary", value)} multiline /></div>
              </div>
              <div role="group" aria-label="Employment Status" className="mt-4 flex flex-wrap gap-2">{([{ value: "student", label: "Student" }, { value: "working", label: "Employed" }] as const).map(item => <button key={item.value} type="button" aria-pressed={status === item.value} onClick={() => { setStatus(item.value); setIsSaved(false); }} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${status === item.value ? "border-primary bg-primary text-white" : "border-outline-variant/60 bg-white text-on-surface-variant"}`}>{item.label}</button>)}</div>
            </Section>
            <Section icon="target" title="Career Goals" subtitle="Target direction and industries of interest">
              <div className="space-y-4">
                <ProfileField label="Target Job Title" value={profile.target} onChange={value => set("target", value)} />
                <label className="block"><span className="text-xs font-semibold text-on-surface-variant">Target Industries</span><input value={profile.industries.join(", ")} onChange={event => { setProfile(current => ({ ...current, industries: event.target.value.split(",").map(item => item.trim()) })); setIsSaved(false); }} placeholder="FinTech, E-commerce" className="mt-1.5 w-full rounded-lg border border-outline-variant/70 px-3 py-2.5 text-sm outline-none focus:border-secondary" /><span className="mt-1 block text-xs text-on-surface-variant">Separate industries with commas.</span></label>
                <ProfileField label="Reason for working in Japan" value={profile.motivation} onChange={value => set("motivation", value)} multiline />
              </div>
            </Section>
          </div>
          <div className="min-w-0 space-y-5">
            <Section icon="translate" title="Language Proficiency" subtitle="Your proficiency and certifications">
              <ProfileListCards key={`languages:${revision}`} kind="language" rows={profile.languages} fields={[{ key: "name", label: "Language" }, { key: "level", label: "Proficiency / Certificate" }, { key: "details", label: "Score / Notes" }]} onChange={(index, key, value) => updateArray("languages", index, key as keyof Profile["languages"][number], value)} onRemove={index => changeList("languages", profile.languages.filter((_, i) => i !== index))} onAdd={() => changeList("languages", [...profile.languages, { name: "", level: "", details: "" }])} addLabel="Add Language" />
              <label className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50 p-3 text-xs font-medium text-indigo-900">JLPT level for interview practice<select aria-label="Select JLPT practice level" value={level} onChange={event => { setLevel(event.target.value); setIsSaved(false); }} className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 font-semibold">{["N5", "N4", "N3", "N2", "N1"].map(item => <option key={item}>{item}</option>)}</select></label>
            </Section>
            <Section icon="terminal" title="Technical Skills" subtitle="Technologies and practical experience">
              <ProfileListCards key={`skills:${revision}`} kind="skill" rows={profile.technicalSkills} fields={[{ key: "name", label: "Skill / Technology" }, { key: "details", label: "Experience / Notes" }]} onChange={(index, key, value) => updateArray("technicalSkills", index, key as keyof Profile["technicalSkills"][number], value)} onRemove={index => changeList("technicalSkills", profile.technicalSkills.filter((_, i) => i !== index))} onAdd={() => changeList("technicalSkills", [...profile.technicalSkills, { name: "", details: "" }])} addLabel="Add Skill" />
            </Section>
          </div>
        </div>
        <Section icon="school" title="Education & Practical Experience" subtitle="Education, work experience, and featured projects">
          <ProfileListCards key={`experience:${revision}`} kind="experience" rows={profile.educationExperience} fields={[{ key: "type", label: "Type" }, { key: "title", label: "Title / Degree / Project" }, { key: "organization", label: "School / Organization" }, { key: "period", label: "Period" }, { key: "details", label: "Description / Achievements" }]} onChange={(index, key, value) => updateArray("educationExperience", index, key as keyof Profile["educationExperience"][number], value)} onRemove={index => changeList("educationExperience", profile.educationExperience.filter((_, i) => i !== index))} onAdd={() => changeList("educationExperience", [...profile.educationExperience, { type: "Experience", title: "", organization: "", period: "", details: "" }])} addLabel="Add Education / Experience / Project" />
        </Section>
      </fieldset>
      <Link href="/interview-setup" className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-secondary">Interview Setup<Icon name="arrow_forward" /></Link>
    </div>
  </DashboardShell>;
}
