"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegradeButton({ sessionId, questionIndex }: { sessionId: string; questionIndex: number }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function regrade() {
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/interviews/${sessionId}/regrade`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not regrade this answer.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not regrade this answer.");
    } finally {
      setWorking(false);
    }
  }

  return <div className="space-y-2">
    <button type="button" disabled={working} onClick={() => void regrade()} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
      {working ? "Grading…" : "Retry grading"}
    </button>
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
  </div>;
}
