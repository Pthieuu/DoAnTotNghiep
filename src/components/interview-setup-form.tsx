"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Icon from "@/components/icon";
import type { CvData } from "@/lib/cv-schema";

type SetupCv = { fileName: string; data: CvData | null };
const field = "mt-1.5 w-full rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm text-primary outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20";
const button = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors";

export default function InterviewSetupForm({ cv }: { cv: SetupCv | null }) {
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [level, setLevel] = useState("N3");
  const [questionCount, setQuestionCount] = useState("6");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [created, setCreated] = useState<{ id: string; title: string; questions: { text: string; translation: string; focus: string; cvEvidence: string | null }[] } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!cv) return;
    const cleanRole = role.trim();
    if (!cleanRole) { setError("Hãy nhập vị trí bạn muốn luyện phỏng vấn."); return; }
    if (cleanRole.length > 160) { setError("Tên vị trí tối đa 160 ký tự."); return; }
    if (company.trim().length > 160) { setError("Tên công ty tối đa 160 ký tự."); return; }
    if (jobDescription.length > 12000) { setError("Mô tả công việc tối đa 12.000 ký tự."); return; }
    setWorking(true);
    setSaved(false);
    setCreated(null);
    try {
      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: cleanRole, company: company.trim(), jobDescription: jobDescription.trim(), level, questionCount: Number(questionCount) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể tạo buổi phỏng vấn.");
      setCreated(result.session);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tạo buổi phỏng vấn.");
    } finally {
      setWorking(false);
    }
  }

  return <div className="mx-auto max-w-4xl space-y-6 pb-16">
    <div className="mb-2 flex items-center gap-2 text-[11px] text-on-surface-variant"><span>Workspace</span><Icon name="chevron_right" /><span className="font-semibold text-primary">Interview Setup</span></div>
    <header><h1 className="text-2xl font-bold tracking-tight text-primary">Thiết lập buổi phỏng vấn</h1><p className="mt-2 text-sm text-on-surface-variant">Chọn mục tiêu để bộ câu hỏi luyện tập bám sát hồ sơ và công việc bạn hướng đến.</p></header>

    {!cv ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="font-semibold text-amber-950">Cần xác nhận CV trước</h2>
      <p className="mt-2 text-sm text-amber-900">Hãy tải CV lên, kiểm tra thông tin AI trích xuất và xác nhận hồ sơ. Sau đó quay lại đây để thiết lập buổi tập.</p>
      <Link href="/cv" className={`${button} mt-4 bg-primary text-white hover:bg-secondary`}>Đi đến My CV <Icon name="arrow_forward" /></Link>
    </section> : <>
      <section className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><Icon name="verified" /><div><p className="text-sm font-semibold text-emerald-950">CV đã xác nhận</p><p className="mt-1 text-xs text-emerald-900">{cv.fileName} · thông tin đã xác nhận sẽ làm dữ liệu nền cho câu hỏi.</p></div></section>
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-surface-container bg-white p-5 shadow-sm sm:p-7">
        <div><label htmlFor="role" className="text-sm font-semibold text-primary">Vị trí ứng tuyển <span className="text-error">*</span></label><input id="role" className={field} value={role} onChange={(e) => { setRole(e.target.value); setSaved(false); }} maxLength={160} required placeholder="Ví dụ: Backend Engineer" /><p className="mt-1 text-xs text-on-surface-variant">Dùng làm tiêu đề buổi phỏng vấn.</p></div>
        <div><label htmlFor="company" className="text-sm font-semibold text-primary">Công ty <span className="font-normal text-on-surface-variant">(không bắt buộc)</span></label><input id="company" className={field} value={company} onChange={(e) => { setCompany(e.target.value); setSaved(false); }} maxLength={160} placeholder="Ví dụ: Công ty bạn đang ứng tuyển" /></div>
        <div><label htmlFor="job-description" className="text-sm font-semibold text-primary">Mô tả công việc (JD) <span className="font-normal text-on-surface-variant">(không bắt buộc)</span></label><textarea id="job-description" className={field} value={jobDescription} onChange={(e) => { setJobDescription(e.target.value); setSaved(false); }} maxLength={12000} rows={6} placeholder="Dán yêu cầu và mô tả công việc để câu hỏi sát vị trí hơn." /><p className="mt-1 text-right text-xs text-on-surface-variant">{jobDescription.length.toLocaleString("vi-VN")} / 12.000</p></div>
        <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="level" className="text-sm font-semibold text-primary">Trình độ tiếng Nhật</label><select id="level" className={field} value={level} onChange={(e) => { setLevel(e.target.value); setSaved(false); }}>{["N5", "N4", "N3", "N2", "N1"].map((item) => <option key={item}>{item}</option>)}</select></div><div><label htmlFor="question-count" className="text-sm font-semibold text-primary">Số câu hỏi</label><select id="question-count" className={field} value={questionCount} onChange={(e) => { setQuestionCount(e.target.value); setSaved(false); }}>{[4, 6, 8].map((count) => <option key={count} value={count}>{count} câu</option>)}</select></div></div>
        {error && <p role="alert" className="rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</p>}
        {saved && created && <section role="status" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div><p className="text-sm font-semibold text-emerald-950">Bộ câu hỏi đã sẵn sàng</p><p className="mt-1 text-xs text-emerald-900">{created.title} · {created.questions.length} câu hỏi. Bạn có thể xem trước nội dung bên dưới.</p></div><ol className="list-decimal space-y-3 pl-5 text-sm text-emerald-950">{created.questions.map((question, index) => <li key={index}><p lang="ja">{question.text}</p><p className="mt-0.5 text-xs text-emerald-800">{question.translation}</p><p className="mt-1 text-[11px] text-emerald-900">Mục tiêu: {question.focus}</p>{question.cvEvidence && <p className="mt-1 border-l-2 border-emerald-300 pl-2 text-[11px] text-emerald-900">Dẫn chứng CV: “{question.cvEvidence}”</p>}</li>)}</ol><Link href={`/interview-room?sessionId=${encodeURIComponent(created.id)}`} className={`${button} bg-primary text-white hover:bg-secondary`}>Bắt đầu luyện tập <Icon name="arrow_forward" /></Link></section>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-surface-container pt-5"><Link href="/cv" className={`${button} border border-outline-variant text-primary`}>Quay lại CV</Link><button disabled={working || !cv} className={`${button} bg-primary text-white hover:bg-secondary disabled:cursor-wait disabled:opacity-60`} type="submit">{working ? <><Icon name="autorenew" />Đang tạo câu hỏi…</> : <>Tạo bộ câu hỏi <Icon name="arrow_forward" /></>}</button></div>
      </form>
      <p className="text-xs text-on-surface-variant">Ngôn ngữ phỏng vấn hiện đặt mặc định là tiếng Nhật. Việc tạo câu hỏi có thể mất một lúc khi AI đang xử lý.</p>
    </>}
  </div>;
}
