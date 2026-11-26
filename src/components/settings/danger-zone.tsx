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

  const isConfirmed = confirmation.trim().toUpperCase() === "DELETE" || confirmation.trim().toUpperCase() === "XÓA";

  function open(value: "history" | "cvs") {
    setTarget(value); setConfirmation(""); setError(""); setSuccess(""); dialog.current?.showModal();
  }

  async function remove() {
    if (!isConfirmed || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/settings/data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, confirmation: confirmation.trim().toUpperCase() })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to delete data.");
      dialog.current?.close();
      setSuccess(target === "history" ? "Interview history deleted successfully." : "CV data and uploads deleted successfully.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete data. Please try again.");
    } finally {
      lock.current = false; setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-white p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-red-700">
        <AlertTriangle size={20} />
        <span>Danger Zone</span>
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Deleted data cannot be recovered. Your account details and preferences will remain intact.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => open("history")}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
        >
          Delete Interview History
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => open("cvs")}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
        >
          Delete Saved CV Data
        </button>
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="delete-data-title"
        aria-describedby="delete-data-description"
        onCancel={(event) => { if (lock.current) event.preventDefault(); }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-white p-6 shadow-xl backdrop:bg-slate-900/50"
      >
        <h3 id="delete-data-title" className="text-lg font-bold text-red-700">
          {target === "history" ? "Delete all interview history?" : "Delete all saved CV data?"}
        </h3>
        <p id="delete-data-description" className="mt-3 text-sm leading-6 text-slate-600">
          {target === "history"
            ? "Permanently deletes all practice sessions, answers, weakness practice logs, and score summaries."
            : "Permanently deletes uploaded CV files and extracted resume data."}{" "}
          This action cannot be undone.
        </p>
        <label htmlFor="delete-confirmation" className="mt-4 block text-sm font-semibold">
          Type <span className="font-mono text-red-700">DELETE</span> to confirm:
        </label>
        <input
          id="delete-confirmation"
          value={confirmation}
          disabled={busy}
          placeholder="DELETE"
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
        />
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={() => dialog.current?.close()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !isConfirmed}
            onClick={remove}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-40 transition-colors"
          >
            {busy ? "Deleting…" : "Delete Permanently"}
          </button>
        </div>
      </dialog>
      {success && <SettingsToast message={success} />}
    </section>
  );
}
