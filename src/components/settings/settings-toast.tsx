"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

export default function SettingsToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = setTimeout(() => setVisible(false), 5000); return () => clearTimeout(timer); }, []);
  if (!visible) return null;
  return <div role="status" className="fixed right-4 bottom-36 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-emerald-800 shadow-lg motion-safe:animate-[toast-in_180ms_ease-out] sm:bottom-24">
    <CheckCircle2 size={20} aria-hidden="true" /><span>{message}</span>
    <button type="button" aria-label="Đóng thông báo" onClick={() => setVisible(false)}><X size={16} /></button>
    <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
  </div>;
}
