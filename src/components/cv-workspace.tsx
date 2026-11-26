"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Icon from "@/components/icon";
import type { IconName } from "@/components/icon";
import type { CvData } from "@/lib/cv-schema";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type Cv = { id: string; file_name: string; file_size: number | null; status: "processing" | "parsed" | "confirmed" | "error"; error_message: string | null; source?: "upload" | "manual"; extracted_data: CvData | null; edited_data?: CvData | null; confirmed_data: CvData | null; extraction_notes: { type: string; section?: string; message: string; evidence?: { text: string; page: number | null }[] }[]; created_at: string; downloadUrl?: string | null };
const empty: CvData = { fullName: null, summary: null, motivation: null, motivationEvidence: [], expectations: null, expectationsEvidence: [], education: [], experience: [], projects: [], skills: [], languages: [], certificates: [] };
const button = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors";
const card = "rounded-2xl border border-surface-container bg-white shadow-sm";
const itemSections = {
  education: { label: "Education", helper: "Schools, majors, or degree programs.", icon: "school" },
  experience: { label: "Experience & Internships", helper: "Roles, responsibilities, and achievements.", icon: "work_outline" },
  projects: { label: "Featured Projects", helper: "Detail your individual contributions for more tailored questions.", icon: "deployed_code" },
  certificates: { label: "Certifications", helper: "Degrees, certificates, or completed coursework.", icon: "badge" },
} as const satisfies Record<"education" | "experience" | "projects" | "certificates", { label: string; helper: string; icon: IconName }>;

function normalizeCv(value: CvData | null | undefined): CvData {
  return {
    ...empty,
    ...value,
    motivationEvidence: value?.motivationEvidence || [],
    expectationsEvidence: value?.expectationsEvidence || [],
  };
}

function FieldLabel({ children, hint }: { children: string; hint?: string }) {
  return <label className="mb-1.5 block text-xs font-semibold text-primary">{children}{hint && <span className="ml-1 font-normal text-on-surface-variant">· {hint}</span>}</label>;
}

export default function CvWorkspace() {
  const [cv, setCv] = useState<Cv | null>(null);
  const [data, setData] = useState<CvData>(empty);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/cv", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load CV.");
      setAiConfigured(result.aiConfigured ?? null);
      setCv(result.cv);
      if (result.cv) setData(normalizeCv(result.cv.edited_data || result.cv.confirmed_data || result.cv.extracted_data));
      else setData(empty);
      setError("");
      setSavedMessage("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load CV."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, [refresh]);
  useEffect(() => {
    if (!cv || cv.status !== "processing") return;
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [cv, refresh]);

  async function processUploadedCv(id: string, force = false) {
    const previousStatus = cv?.id === id ? cv.status : null;
    setWorking(true); setError("");
    try {
      const response = await fetch(`/api/cv/${id}/process`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not extract CV.");
      setCv((old) => old ? { ...old, ...result.cv } : old);
      setData(normalizeCv(result.cv.extracted_data));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not extract CV.";
      setError(message);
      setCv((old) => old?.id === id ? { ...old, status: force && (previousStatus === "parsed" || previousStatus === "confirmed") ? previousStatus : "error", error_message: message } : old);
    }
    finally { setWorking(false); }
  }

  async function acceptFile(file?: File) {
    if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "pdf" && ext !== "docx") { setError("System supports PDF or DOCX files."); return; }
    if (!file.size || file.size > 15 * 1024 * 1024) { setError("File size must be between 1 byte and 15 MB."); return; }
    setError(""); setWorking(true); setUploadProgress(0);
    try {
      const prepared = await fetch("/api/cv/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: file.name, fileSize: file.size }) });
      const upload = await prepared.json();
      if (!prepared.ok) throw new Error(upload.error || "Could not prepare file upload.");
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error("Supabase is not configured.");
      const storage = createSupabaseClient(url, key).storage.from("candidate-cvs");
      const { error: uploadError } = await storage.uploadToSignedUrl(upload.path, upload.token, file, {
        contentType: ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      if (uploadError) throw new Error(uploadError.message);
      const response = await fetch("/api/cv/upload", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: upload.id, fileName: file.name, fileSize: file.size }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not upload file.");
      const uploaded: Cv = { ...result.cv, error_message: null, extracted_data: null, edited_data: null, confirmed_data: null, extraction_notes: [], created_at: result.cv.created_at };
      setCv(uploaded); setData(empty); setUploadProgress(null);
      void processUploadedCv(uploaded.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not upload file."); setUploadProgress(null); }
    finally { setWorking(false); }
  }
  async function createManual() {
    setWorking(true); setError(""); setSavedMessage("");
    try {
      const response = await fetch("/api/cv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ manual: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create manual CV.");
      setCv(result.cv); setData(empty);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create manual CV."); }
    finally { setWorking(false); }
  }
  function onFileChange(event: ChangeEvent<HTMLInputElement>) { void acceptFile(event.target.files?.[0]); event.target.value = ""; }
  function onDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); void acceptFile(event.dataTransfer.files?.[0]); }
  async function save(confirmed: boolean) {
    if (!cv) return;
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/cv", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cv.id, data, confirmed }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not save CV.");
      setCv({ ...cv, ...result.cv });
      setData(normalizeCv(confirmed ? result.cv.confirmed_data : result.cv.edited_data));
      setSavedMessage(confirmed ? "CV information confirmed and saved to database." : "Edits saved. Please confirm before using for interview sessions.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save CV."); }
    finally { setWorking(false); }
  }
  async function remove() {
    if (!cv) return;
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/cv", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cv.id }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not delete CV.");
      setCv(null); setData(empty);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete CV."); }
    finally { setWorking(false); }
  }
  function editScalar(key: "fullName" | "summary" | "motivation" | "expectations", value: string) { setData((d) => ({ ...d, [key]: value || null })); }
  function editItem(section: "education" | "experience" | "projects" | "certificates", index: number, key: string, value: string) {
    setData((d) => ({ ...d, [section]: d[section].map((item, i) => i === index ? { ...item, [key]: value || null } : item) }));
  }
  function addItem(section: "education" | "experience" | "projects" | "certificates") { setData((d) => ({ ...d, [section]: [...d[section], { title: "", organization: null, period: null, description: null, evidence: [] }] })); }
  function deleteItem(section: "education" | "experience" | "projects" | "certificates", index: number) { setData((d) => ({ ...d, [section]: d[section].filter((_, i) => i !== index) })); }
  const state = cv?.status || "empty";

  return <div className="mx-auto max-w-6xl space-y-6 pb-16">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[11px] text-on-surface-variant"><span>Workspace</span><Icon name="chevron_right" /><span className="font-semibold text-primary">My CV</span></div><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-secondary-fixed text-primary"><Icon name="description" /></span><div><h1 className="text-2xl font-bold tracking-tight text-primary">My CV</h1><p className="mt-1 text-sm text-on-surface-variant">Prepare your profile so AI understands your background and tailors interview questions.</p></div></div></div><span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-[11px] font-medium text-on-surface-variant"><span className={`size-2 rounded-full ${state === "confirmed" ? "bg-emerald-500" : state === "parsed" ? "bg-amber-500" : state === "processing" ? "animate-pulse bg-secondary" : state === "error" ? "bg-red-500" : "bg-outline"}`} />{state === "confirmed" ? "Confirmed" : state === "parsed" ? "Awaiting Review" : state === "processing" ? "Processing" : state === "error" ? "Needs Attention" : loading ? "Loading" : "No CV"}</span></div>
    {error && <p role="alert" className="rounded-lg bg-error-container px-4 py-3 text-xs text-on-error-container">{error}</p>}
    {savedMessage && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">{savedMessage}</p>}
    {aiConfigured === false && state === "empty" && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">CV extraction AI is not configured on the server. Add <code>GEMINI_API_KEY</code> to backend environment variables for automated parsing; you can still enter information manually.</p>}
    {state === "empty" && <section className={`${card} p-5 sm:p-8`}><div onClick={() => input.current?.click()} onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors ${dragging ? "border-secondary bg-secondary-fixed/30" : "border-outline-variant hover:border-secondary hover:bg-surface-container-low/60"}`}><span className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-secondary-fixed text-primary"><Icon name="cloud_upload" /></span><h2 className="text-base font-semibold text-primary">Drag and drop your CV file here</h2><p className="mt-1 text-sm text-on-surface-variant">or click to browse from computer</p><span className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant"><Icon name="info" />Supported formats: <strong>PDF, DOCX</strong> · Max 15MB</span><button type="button" disabled={working} onClick={(e) => { e.stopPropagation(); input.current?.click(); }} className={`${button} mt-5 bg-primary text-white hover:bg-secondary disabled:opacity-50`}><Icon name="upload_file" />{working ? "Uploading…" : "Upload CV File"}</button><input ref={input} onChange={onFileChange} accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" type="file" aria-label="Select CV File" /></div><div className="mt-6 border-t border-surface-container pt-5"><h3 className="text-sm font-semibold text-primary">Don&apos;t have a finished CV?</h3><p className="mt-1 text-xs text-on-surface-variant">You can enter information manually to create your CV profile.</p><button disabled={working} className={`${button} mt-3 border border-outline-variant`} onClick={() => void createManual()}>Enter Information Manually</button></div></section>}
    {uploadProgress !== null && <p className="text-xs text-on-surface-variant">Uploading file…</p>}
    {state === "processing" && cv && <section className={`${card} p-6`}><div className="flex items-center gap-3"><span className="animate-pulse text-secondary"><Icon name="autorenew" /></span><div><h2 className="text-sm font-semibold text-primary">Extracting CV Information</h2><p className="mt-1 text-xs text-on-surface-variant">{cv.file_name} · server status</p></div></div><p className="mt-5 text-xs text-on-surface-variant">This process may take a moment. The page will automatically update once completed.</p></section>}
    {state === "error" && cv && <section className={`${card} space-y-4 p-6`}><h2 className="font-semibold text-primary">Failed to parse CV</h2><p className="text-sm text-on-surface-variant">{cv.error_message || "An error occurred during processing."}</p>{(cv.error_message || "").includes("GEMINI_API_KEY") && <div className="rounded-lg bg-amber-50 p-4 text-xs leading-relaxed text-amber-950"><strong>AI is not configured on the server.</strong><ol className="ml-4 mt-2 list-decimal space-y-1"><li>Add <code>GEMINI_API_KEY=...</code> to <code>.env.local</code> in project root.</li><li>Restart the dev server after saving environment variables.</li><li>Return here and click &quot;Retry&quot;.</li></ol></div>}<div className="flex gap-2"><button disabled={working} className={`${button} bg-primary text-white`} onClick={() => void processUploadedCv(cv.id)}>Retry</button><button className={`${button} border`} onClick={() => { setCv({ ...cv, status: "parsed" }); setData(cv.extracted_data || empty); }}>Manual Input</button><button disabled={working} className={`${button} border`} onClick={() => void remove()}>Delete CV</button></div></section>}
    {(state === "parsed" || state === "confirmed") && cv && <>
      <section className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}><div><strong className="text-sm text-primary">{cv.file_name}</strong><p className="mt-1 text-xs text-on-surface-variant">{cv.file_size ? `${(cv.file_size / 1024 / 1024).toFixed(2)} MB` : "Manual input"} · {new Date(cv.created_at).toLocaleString("en-US")}</p></div><div className="flex flex-wrap gap-2">{cv.downloadUrl && <a className={`${button} border`} href={cv.downloadUrl} target="_blank" rel="noreferrer">View / Download</a>}{cv.file_size !== null && cv.file_size > 0 && cv.id !== "manual" && <button disabled={working} title="Re-extract CV and normalize descriptions" className={`${button} border`} onClick={() => void processUploadedCv(cv.id, true)}><Icon name="autorenew" />Re-extract &amp; Normalize</button>}<button disabled={working} className={`${button} border`} onClick={() => input.current?.click()}>Replace CV</button><button disabled={working} className={`${button} border text-error`} onClick={() => void remove()}>Delete</button><input ref={input} onChange={onFileChange} accept=".pdf,.docx" className="hidden" type="file" /></div></section>
      {state === "confirmed" && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">CV has been confirmed and saved to your account.</div>}
      {cv.extraction_notes?.length > 0 && <section className={`${card} p-4`}><h2 className="mb-2 text-sm font-semibold text-primary">Extraction Notes</h2>{cv.extraction_notes.map((n, i) => <p className="mt-2 text-xs text-on-surface-variant" key={i}>{n.message}{n.evidence?.map((e) => ` “${e.text}”${e.page ? ` (page ${e.page})` : ""}`).join("")}</p>)}</section>}
      <section className={`${card} overflow-hidden`}>
        <div className="border-b border-surface-container bg-gradient-to-r from-primary to-secondary p-5 text-white"><div className="flex items-start gap-3"><span className="mt-0.5 rounded-xl bg-white/15 p-2 text-lg"><Icon name="edit_document" /></span><div><h2 className="font-semibold">AI-Extracted CV Information</h2><p className="mt-1 text-sm text-white/75">Review and edit before confirming. Empty sections indicate information was not clearly found in your CV.</p></div></div></div>
        <div className="grid gap-5 p-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-5">
            <div><FieldLabel>Full Name</FieldLabel><input className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-primary outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15" value={data.fullName || ""} onChange={(e) => editScalar("fullName", e.target.value)} placeholder="Not found in CV" /></div>
            <div><FieldLabel hint="AI uses this to quickly understand your background">Profile Summary</FieldLabel><textarea className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-sm leading-6 text-primary outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/15" rows={4} value={data.summary || ""} onChange={(e) => editScalar("summary", e.target.value)} placeholder="e.g. Computer Science student with experience in web development using React and Node.js." /></div>
          </div>
          <div className="rounded-2xl border border-secondary/15 bg-secondary-fixed/30 p-4"><div className="flex items-center gap-2 text-primary"><Icon name="psychology" /><h2 className="text-sm font-bold">Key Context for AI Interviewer</h2></div><div className="mt-4 space-y-4"><div><FieldLabel>Application Motivation</FieldLabel><textarea className="w-full rounded-xl border border-outline-variant bg-white p-3 text-sm leading-6 text-primary outline-none focus:border-secondary" rows={3} value={data.motivation || ""} onChange={(e) => editScalar("motivation", e.target.value)} placeholder="Not clearly stated in CV" />{data.motivationEvidence.map((e, i) => <p key={i} className="mt-1.5 text-[11px] text-on-surface-variant">Excerpt from CV: “{e.text}”{e.page ? ` · page ${e.page}` : ""}</p>)}</div><div><FieldLabel>Career Expectations</FieldLabel><textarea className="w-full rounded-xl border border-outline-variant bg-white p-3 text-sm leading-6 text-primary outline-none focus:border-secondary" rows={3} value={data.expectations || ""} onChange={(e) => editScalar("expectations", e.target.value)} placeholder="Not clearly stated in CV" />{data.expectationsEvidence.map((e, i) => <p key={i} className="mt-1.5 text-[11px] text-on-surface-variant">Excerpt from CV: “{e.text}”{e.page ? ` · page ${e.page}` : ""}</p>)}</div></div></div>
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className={`${card} p-5`}><div className="mb-4 flex items-center gap-2"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Icon name="terminal" /></span><div><h2 className="text-sm font-bold text-primary">Skills</h2><p className="text-xs text-on-surface-variant">Separate skills with commas.</p></div></div><textarea className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-sm text-primary outline-none focus:border-secondary" rows={4} value={data.skills.join(", ")} onChange={(e) => setData((d) => ({ ...d, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} placeholder="React, Node.js, TypeScript, SQL" /><div className="mt-3 flex flex-wrap gap-2">{data.skills.slice(0, 12).map((skill) => <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-primary" key={skill}>{skill}</span>)}</div></section>
        <section className={`${card} p-5`}><div className="mb-4 flex items-center gap-2"><span className="rounded-lg bg-sky-50 p-2 text-sky-700"><Icon name="translate" /></span><div><h2 className="text-sm font-bold text-primary">Languages</h2><p className="text-xs text-on-surface-variant">Enter language and proficiency, e.g. Japanese — N2.</p></div></div><div className="space-y-2">{data.languages.map((l, i) => <div className="flex gap-2" key={i}><input className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-primary outline-none focus:border-secondary" value={`${l.name}${l.level ? ` — ${l.level}` : ""}`} onChange={(e) => setData((d) => ({ ...d, languages: d.languages.map((x, j) => j === i ? { ...x, name: e.target.value, level: null } : x) }))} placeholder="e.g. Japanese — N2" /><button type="button" className="rounded-lg px-2 text-error hover:bg-error-container" aria-label="Delete language" onClick={() => setData((d) => ({ ...d, languages: d.languages.filter((_, j) => j !== i) }))}>×</button></div>)}</div><button type="button" className="mt-3 text-xs font-semibold text-secondary hover:text-primary" onClick={() => setData((d) => ({ ...d, languages: [...d.languages, { name: "", level: null, evidence: [] }] }))}><Icon name="add" className="mr-1 inline" />Add Language</button></section>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {(Object.entries(itemSections) as [keyof typeof itemSections, typeof itemSections[keyof typeof itemSections]][]).map(([section, meta]) => <section className={`${card} p-5`} key={section}><div className="mb-4 flex items-start gap-3"><span className="rounded-xl bg-surface-container-low p-2 text-primary"><Icon name={meta.icon} /></span><div><h2 className="text-sm font-bold text-primary">{meta.label}</h2><p className="mt-0.5 text-xs leading-5 text-on-surface-variant">{meta.helper}</p></div></div><div className="space-y-3">{data[section].map((item, i) => <article key={i} className="rounded-xl border border-surface-container bg-surface-container-lowest p-3"><div className="mb-3 flex items-center gap-2"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary-fixed text-[11px] font-bold text-primary">{i + 1}</span><input className="min-w-0 flex-1 border-b border-outline-variant bg-transparent pb-1 text-sm font-semibold text-primary outline-none focus:border-secondary" placeholder="Title / Role" value={item.title} onChange={(e) => editItem(section, i, "title", e.target.value)} /><button type="button" className="rounded p-1 text-error hover:bg-error-container" onClick={() => deleteItem(section, i)} aria-label={`Delete ${meta.label}`}>×</button></div><div className="grid gap-2 sm:grid-cols-2"><div><FieldLabel>Organization</FieldLabel><input className="w-full rounded-lg border border-outline-variant bg-white px-2.5 py-2 text-xs text-primary outline-none focus:border-secondary" placeholder="Company / University" value={item.organization || ""} onChange={(e) => editItem(section, i, "organization", e.target.value)} /></div><div><FieldLabel>Period</FieldLabel><input className="w-full rounded-lg border border-outline-variant bg-white px-2.5 py-2 text-xs text-primary outline-none focus:border-secondary" placeholder="e.g. 01/2024 – 06/2024" value={item.period || ""} onChange={(e) => editItem(section, i, "period", e.target.value)} /></div></div><div className="mt-2"><FieldLabel hint="Role, tasks performed, and outcomes">Description</FieldLabel><textarea className="w-full rounded-lg border border-outline-variant bg-white p-2.5 text-xs leading-5 text-primary outline-none focus:border-secondary" rows={3} placeholder="No description yet. Add details about your direct contributions." value={item.description || ""} onChange={(e) => editItem(section, i, "description", e.target.value)} /></div>{item.evidence.length > 0 && <details className="mt-2 text-[11px] text-on-surface-variant"><summary className="cursor-pointer text-secondary">View original excerpt from CV</summary>{item.evidence.map((ev, ei) => <p className="mt-1" key={ei}>“{ev.text}”{ev.page ? ` · page ${ev.page}` : ""}</p>)}</details>}</article>)}</div><button type="button" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary" onClick={() => addItem(section)}><Icon name="add" />Add {meta.label.toLowerCase()}</button></section>)}
      </div>
      <div className="flex justify-end gap-2 border-t border-surface-container pt-4"><button disabled={working} className={`${button} border`} onClick={() => void save(false)}>Save Draft</button><button disabled={working} className={`${button} bg-primary text-white`} onClick={() => void save(true)}><Icon name="verified" />Confirm CV Information</button></div>
    </>}
  </div>;
}
