"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import SettingsToast from "./settings-toast";

export default function DangerZone() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement | null>(null);
  const lock = useRef(false);
  const [target, setTarget] = useState<"history" | "cvs">("history");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  function open(value: "history" | "cvs") {
    setTarget(value); setConfirmation(""); setError(""); setSuccess(""); dialog.current?.showModal();
  }
  async function remove() {
    if (confirmation !== "XÓA" || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/settings/data", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target, confirmation }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Không thể xóa dữ liệu.");
      dialog.current?.close(); setSuccess(target === "history" ? "Đã xóa lịch sử phỏng vấn." : "Đã xóa CV đã lưu và tệp tải lên."); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xóa dữ liệu. Hãy thử lại."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="rounded-2xl border border-red-200 bg-white p-6">
    <h2 className="flex items-center gap-2 text-lg font-bold text-red-700"><AlertTriangle size={20} />Vùng nguy hiểm</h2>
    <p className="mt-2 text-sm text-slate-600">Dữ liệu đã xóa không thể khôi phục. Tài khoản và cài đặt của bạn vẫn được giữ.</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={() => open("history")} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700">Xóa lịch sử phỏng vấn</button>
      <button type="button" disabled={busy} onClick={() => open("cvs")} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700">Xóa dữ liệu CV</button>
    </div>
    <dialog ref={dialog} aria-labelledby="delete-data-title" aria-describedby="delete-data-description" onCancel={(event) => { if (lock.current) event.preventDefault(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-6 shadow-xl backdrop:bg-slate-900/50">
      <h3 id="delete-data-title" className="text-lg font-bold text-red-700">{target === "history" ? "Xóa toàn bộ lịch sử phỏng vấn?" : "Xóa toàn bộ CV đã lưu?"}</h3>
      <p id="delete-data-description" className="mt-3 text-sm leading-6 text-slate-600">{target === "history" ? "Xóa tất cả phiên phỏng vấn, phiên luyện điểm yếu, câu trả lời và báo cáo của bạn, kể cả phiên đang diễn ra." : "Xóa CV nhập thủ công, dữ liệu trích xuất và tệp CV tải lên. Bản chụp CV trong lịch sử phỏng vấn và bản nháp trên trình duyệt vẫn còn; hãy xóa lịch sử nếu muốn loại bỏ các báo cáo liên quan."} Thao tác không thể hoàn tác.</p>
      <label htmlFor="delete-confirmation" className="mt-4 block text-sm font-semibold">Nhập XÓA để xác nhận</label>
      <input id="delete-confirmation" value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="mt-2 w-full rounded-lg border border-slate-300 p-3" />
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" autoFocus disabled={busy} onClick={() => dialog.current?.close()} className="rounded-lg border px-4 py-2">Hủy</button>
        <button type="button" disabled={busy || confirmation !== "XÓA"} onClick={remove} className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-40">{busy ? "Đang xóa…" : "Xóa vĩnh viễn"}</button>
      </div>
    </dialog>
    {success && <SettingsToast message={success} />}
  </section>;
}
