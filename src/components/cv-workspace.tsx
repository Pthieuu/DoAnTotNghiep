"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Icon from "@/components/icon";
import type { CvData } from "@/lib/cv-schema";

type Cv = { id: string; file_name: string; file_size: number; status: "processing" | "parsed" | "confirmed" | "error"; error_message: string | null; extracted_data: CvData | null; confirmed_data: CvData | null; extraction_notes: { type: string; section?: string; message: string; evidence?: { text: string; page: number | null }[] }[]; created_at: string; downloadUrl?: string | null };
const empty: CvData = { fullName: null, summary: null, motivation: null, motivationEvidence: [], expectations: null, expectationsEvidence: [], education: [], experience: [], projects: [], skills: [], languages: [], certificates: [] };
const button = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors";
const card = "rounded-2xl border border-surface-container bg-white shadow-sm";
const human: Record<string, string> = { fullName: "Họ tên", summary: "Giới thiệu", motivation: "Động lực", expectations: "Kỳ vọng nghề nghiệp", education: "Học vấn", experience: "Kinh nghiệm / thực tập", projects: "Dự án / hoạt động", skills: "Kỹ năng", languages: "Ngoại ngữ", certificates: "Chứng chỉ" };

function normalizeCv(value: CvData | null | undefined): CvData {
  return {
    ...empty,
    ...value,
    motivationEvidence: value?.motivationEvidence || [],
    expectationsEvidence: value?.expectationsEvidence || [],
  };
}

export default function CvWorkspace() {
  const [cv, setCv] = useState<Cv | null>(null);
  const [data, setData] = useState<CvData>(empty);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/cv", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không tải được CV.");
      setAiConfigured(result.aiConfigured ?? null);
      setCv(result.cv);
      if (result.cv) setData(normalizeCv(result.cv.confirmed_data || result.cv.extracted_data));
      else setData(empty);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Không tải được CV."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void refresh(), 0); return () => window.clearTimeout(timer); }, [refresh]);
  useEffect(() => {
    if (!cv || cv.status !== "processing") return;
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [cv, refresh]);

  async function process(id: string, force = false) {
    const previousStatus = cv?.id === id ? cv.status : null;
    setWorking(true); setError("");
    try {
      const response = await fetch(`/api/cv/${id}/process`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không trích xuất được CV.");
      setCv((old) => old ? { ...old, ...result.cv } : old);
      setData(normalizeCv(result.cv.extracted_data));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Không trích xuất được CV.";
      setError(message);
      setCv((old) => old?.id === id ? { ...old, status: force && (previousStatus === "parsed" || previousStatus === "confirmed") ? previousStatus : "error", error_message: message } : old);
    }
    finally { setWorking(false); }
  }

  async function acceptFile(file?: File) {
    if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "pdf" && ext !== "docx") { setError("Hệ thống hỗ trợ tệp PDF hoặc DOCX."); return; }
    if (!file.size || file.size > 15 * 1024 * 1024) { setError("Dung lượng tệp phải từ 1 byte đến 15 MB."); return; }
    setError(""); setWorking(true); setUploadProgress(0);
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/cv", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không tải được tệp.");
      const uploaded: Cv = { ...result.cv, error_message: null, extracted_data: null, confirmed_data: null, extraction_notes: [], created_at: result.cv.created_at };
      setCv(uploaded); setData(empty); setUploadProgress(null);
      void process(uploaded.id);
    } catch (e) { setError(e instanceof Error ? e.message : "Không tải được tệp."); setUploadProgress(null); }
    finally { setWorking(false); }
  }
  function onFileChange(event: ChangeEvent<HTMLInputElement>) { void acceptFile(event.target.files?.[0]); event.target.value = ""; }
  function onDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); void acceptFile(event.dataTransfer.files?.[0]); }
  async function save(confirmed: boolean) {
    if (!cv) return;
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/cv", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cv.id, data }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Không lưu được CV.");
      setCv({ ...cv, status: "confirmed", confirmed_data: result.cv.confirmed_data });
      if (!confirmed) setError("Thông tin đã được lưu. Trạng thái xác nhận được cập nhật sau khi lưu thành công.");
    } catch (e) { setError(e instanceof Error ? e.message : "Không lưu được CV."); }
    finally { setWorking(false); }
  }
  async function remove() {
    if (!cv) return;
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/cv", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cv.id }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Không xóa được CV.");
      setCv(null); setData(empty);
    } catch (e) { setError(e instanceof Error ? e.message : "Không xóa được CV."); }
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
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[11px] text-on-surface-variant"><span>Workspace</span><Icon name="chevron_right" /><span className="font-semibold text-primary">My CV</span></div><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-secondary-fixed text-primary"><Icon name="description" /></span><div><h1 className="text-2xl font-bold tracking-tight text-primary">My CV</h1><p className="mt-1 text-sm text-on-surface-variant">Chuẩn bị hồ sơ để AI hiểu kinh nghiệm và cá nhân hóa buổi phỏng vấn.</p></div></div></div><span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-[11px] font-medium text-on-surface-variant"><span className={`size-2 rounded-full ${state === "confirmed" ? "bg-emerald-500" : state === "parsed" ? "bg-amber-500" : state === "processing" ? "animate-pulse bg-secondary" : state === "error" ? "bg-red-500" : "bg-outline"}`} />{state === "confirmed" ? "CV đã xác nhận" : state === "parsed" ? "Chờ bạn kiểm tra" : state === "processing" ? "Đang xử lý" : state === "error" ? "Cần xử lý lại" : loading ? "Đang tải" : "Chưa có CV"}</span></div>
    {error && <p role="alert" className="rounded-lg bg-error-container px-4 py-3 text-xs text-on-error-container">{error}</p>}
    {aiConfigured === false && state === "empty" && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">AI trích xuất CV chưa được cấu hình trên máy chủ. Thêm <code>OPENAI_API_KEY</code> vào biến môi trường backend để tự động đọc CV; bạn vẫn có thể nhập thông tin thủ công.</p>}
    {state === "empty" && <section className={`${card} p-5 sm:p-8`}><div onClick={() => input.current?.click()} onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition-colors ${dragging ? "border-secondary bg-secondary-fixed/30" : "border-outline-variant hover:border-secondary hover:bg-surface-container-low/60"}`}><span className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-secondary-fixed text-primary"><Icon name="cloud_upload" /></span><h2 className="text-base font-semibold text-primary">Kéo và thả tệp CV của bạn vào đây</h2><p className="mt-1 text-sm text-on-surface-variant">hoặc nhấn để duyệt tệp từ máy tính</p><span className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant"><Icon name="info" />Định dạng hỗ trợ: <strong>PDF, DOCX</strong> · Tối đa 15MB</span><button type="button" disabled={working} onClick={(e) => { e.stopPropagation(); input.current?.click(); }} className={`${button} mt-5 bg-primary text-white hover:bg-secondary disabled:opacity-50`}><Icon name="upload_file" />{working ? "Đang tải lên…" : "Chọn tệp CV tải lên"}</button><input ref={input} onChange={onFileChange} accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" type="file" aria-label="Chọn tệp CV" /></div><div className="mt-6 border-t border-surface-container pt-5"><h3 className="text-sm font-semibold text-primary">Chưa có CV hoàn chỉnh?</h3><p className="mt-1 text-xs text-on-surface-variant">Bạn có thể nhập thông tin thủ công để lưu bản CV.</p><button className={`${button} mt-3 border border-outline-variant`} onClick={() => { setCv({ id: "manual", file_name: "Nhập thủ công", file_size: 0, status: "parsed", error_message: null, extracted_data: empty, confirmed_data: null, extraction_notes: [], created_at: new Date().toISOString() }); setData(empty); }}>Nhập thông tin thủ công</button></div></section>}
    {uploadProgress !== null && <p className="text-xs text-on-surface-variant">Đang gửi tệp lên…</p>}
    {state === "processing" && cv && <section className={`${card} p-6`}><div className="flex items-center gap-3"><span className="animate-pulse text-secondary"><Icon name="autorenew" /></span><div><h2 className="text-sm font-semibold text-primary">Đang trích xuất thông tin CV</h2><p className="mt-1 text-xs text-on-surface-variant">{cv.file_name} · trạng thái từ máy chủ</p></div></div><p className="mt-5 text-xs text-on-surface-variant">Quá trình có thể mất một lúc. Trang sẽ tự cập nhật khi xử lý xong.</p></section>}
    {state === "error" && cv && <section className={`${card} space-y-4 p-6`}><h2 className="font-semibold text-primary">Chưa đọc được CV</h2><p className="text-sm text-on-surface-variant">{cv.error_message || "Đã xảy ra lỗi khi xử lý."}</p>{(cv.error_message || "").includes("OPENAI_API_KEY") && <div className="rounded-lg bg-amber-50 p-4 text-xs leading-relaxed text-amber-950"><strong>AI chưa được cấu hình trên máy chủ.</strong><ol className="ml-4 mt-2 list-decimal space-y-1"><li>Thêm <code>OPENAI_API_KEY=...</code> vào file <code>.env.local</code> ở thư mục dự án (hoặc Environment Variables trên nơi deploy).</li><li>Khởi động lại ứng dụng sau khi lưu biến môi trường.</li><li>Quay lại đây và bấm “Thử lại”.</li></ol><p className="mt-2">Không đưa khóa vào mã frontend hoặc tên biến <code>NEXT_PUBLIC_*</code>.</p></div>}<div className="flex gap-2"><button disabled={working} className={`${button} bg-primary text-white`} onClick={() => void process(cv.id)}>Thử lại</button><button className={`${button} border`} onClick={() => { setCv({ ...cv, status: "parsed" }); setData(cv.extracted_data || empty); }}>Nhập thủ công</button><button disabled={working} className={`${button} border`} onClick={() => void remove()}>Xóa CV</button></div></section>}
    {(state === "parsed" || state === "confirmed") && cv && <>
      <section className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}><div><strong className="text-sm text-primary">{cv.file_name}</strong><p className="mt-1 text-xs text-on-surface-variant">{cv.file_size ? `${(cv.file_size / 1024 / 1024).toFixed(2)} MB` : "Nhập thủ công"} · {new Date(cv.created_at).toLocaleString("vi-VN")}</p></div><div className="flex flex-wrap gap-2">{cv.downloadUrl && <a className={`${button} border`} href={cv.downloadUrl} target="_blank" rel="noreferrer">Xem / tải file</a>}{cv.file_size > 0 && cv.id !== "manual" && <button disabled={working} className={`${button} border`} onClick={() => void process(cv.id, true)}>Đọc lại bằng AI</button>}<button disabled={working} className={`${button} border`} onClick={() => input.current?.click()}>Thay CV</button><button disabled={working} className={`${button} border text-error`} onClick={() => void remove()}>Xóa</button><input ref={input} onChange={onFileChange} accept=".pdf,.docx" className="hidden" type="file" /></div></section>
      {state === "confirmed" && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">CV đã được xác nhận và lưu cho tài khoản của bạn.</div>}
      {cv.extraction_notes?.length > 0 && <section className={`${card} p-4`}><h2 className="mb-2 text-sm font-semibold text-primary">Ghi chú khi đọc CV</h2>{cv.extraction_notes.map((n, i) => <p className="mt-2 text-xs text-on-surface-variant" key={i}>{n.message}{n.evidence?.map((e) => ` “${e.text}”${e.page ? ` (trang ${e.page})` : ""}`).join("")}</p>)}</section>}
      <div className="grid gap-4 md:grid-cols-2">
        {(["fullName", "summary", "motivation", "expectations", "education", "experience", "projects", "skills", "languages", "certificates"] as const).map((section) => (
          <section className={`${card} space-y-3 p-4`} key={section}>
            <h2 className="text-sm font-bold text-primary">{human[section]}</h2>
            {section === "fullName" || section === "summary" || section === "motivation" || section === "expectations" ? <>
              <textarea className="w-full rounded-lg border border-outline-variant p-3 text-sm text-primary" rows={section === "fullName" ? 1 : 4} value={data[section] || ""} onChange={(e) => editScalar(section, e.target.value)} placeholder="Không tìm thấy trong CV" />
              {(section === "motivation" || section === "expectations") && (section === "motivation" ? data.motivationEvidence : data.expectationsEvidence)?.map((evidence, i) => <p key={i} className="text-[10px] text-on-surface-variant">Nguồn: “{evidence.text}”{evidence.page ? ` · trang ${evidence.page}` : ""}</p>)}
            </> : section === "skills" ? <textarea className="w-full rounded-lg border border-outline-variant p-3 text-sm text-primary" rows={3} value={data.skills.join(", ")} onChange={(e) => setData((d) => ({ ...d, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))} placeholder="Nhập kỹ năng, phân cách bằng dấu phẩy" /> : section === "languages" ? <div className="space-y-2">{data.languages.map((l, i) => <input key={i} className="w-full rounded-lg border p-2 text-sm" value={`${l.name}${l.level ? ` — ${l.level}` : ""}`} onChange={(e) => setData((d) => ({ ...d, languages: d.languages.map((x, j) => j === i ? { ...x, name: e.target.value, level: null } : x) }))} />)}<button className="text-xs font-semibold text-secondary" onClick={() => setData((d) => ({ ...d, languages: [...d.languages, { name: "", level: null, evidence: [] }] }))}>+ Thêm ngoại ngữ</button></div> : <div className="space-y-3">{data[section].map((item, i) => <div key={i} className="space-y-2 rounded-lg bg-surface-container-low p-3"><div className="flex gap-2"><input className="min-w-0 flex-1 rounded border p-2 text-xs" placeholder="Tên / chức danh" value={item.title} onChange={(e) => editItem(section, i, "title", e.target.value)} /><button className="text-error" onClick={() => deleteItem(section, i)} aria-label="Xóa mục">×</button></div><input className="w-full rounded border p-2 text-xs" placeholder="Trường / đơn vị" value={item.organization || ""} onChange={(e) => editItem(section, i, "organization", e.target.value)} /><input className="w-full rounded border p-2 text-xs" placeholder="Thời gian" value={item.period || ""} onChange={(e) => editItem(section, i, "period", e.target.value)} /><textarea className="w-full rounded border p-2 text-xs" rows={3} placeholder="Nhiệm vụ, cách thực hiện, kết quả" value={item.description || ""} onChange={(e) => editItem(section, i, "description", e.target.value || "")} />{item.evidence.map((ev, ei) => <p key={ei} className="text-[10px] text-on-surface-variant">Nguồn: “{ev.text}”{ev.page ? ` · trang ${ev.page}` : ""}</p>)}</div>)}<button className="text-xs font-semibold text-secondary" onClick={() => addItem(section)}>+ Thêm mục</button></div>}
          </section>
        ))}
      </div>
      <div className="flex justify-end gap-2 border-t border-surface-container pt-4"><button disabled={working} className={`${button} border`} onClick={() => void save(false)}>Lưu chỉnh sửa</button><button disabled={working} className={`${button} bg-primary text-white`} onClick={() => void save(true)}><Icon name="verified" />Xác nhận thông tin CV</button></div>
    </>}
    {state === "confirmed" && <p className="text-center text-xs text-on-surface-variant">Luồng tạo câu hỏi/phỏng vấn chưa được triển khai trong dự án.</p>}
  </div>;
}
