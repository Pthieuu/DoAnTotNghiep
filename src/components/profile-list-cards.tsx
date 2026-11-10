"use client";

import { useState } from "react";
import Icon from "@/components/icon";

type Field = { key: string; label: string };

export default function ProfileListCards({ rows, fields, onChange, onRemove, onAdd, addLabel, kind }: {
  rows: Record<string, string>[];
  fields: Field[];
  onChange: (index: number, key: string, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  addLabel: string;
  kind: "language" | "experience" | "skill";
}) {
  const [editing, setEditing] = useState<number | null>(null);
  return <div className="space-y-3">
    {rows.length === 0 && <p className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low/40 p-4 text-sm text-on-surface-variant">Chưa có thông tin. Thêm một mục để hoàn thiện hồ sơ.</p>}
    <div className={`grid gap-3 ${kind === "experience" ? "md:grid-cols-2" : ""}`}>
      {rows.map((row, index) => {
        const title = row.name || row.title || "Mục mới";
        const badge = kind === "language" ? row.level : kind === "experience" ? row.type : "";
        return <article key={index} className="min-w-0 rounded-xl border border-outline-variant/50 bg-surface-container-low/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words text-sm font-semibold text-primary">{title}</h3>
              {badge && <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${kind === "language" ? /(?:JLPT\s*)?N[1-5]\b/i.test(badge) ? "bg-indigo-100 text-indigo-800" : "bg-emerald-100 text-emerald-800" : "bg-secondary-fixed text-primary"}`}>{badge}</span>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" aria-label={`Chỉnh sửa ${title}`} aria-expanded={editing === index} onClick={() => setEditing(editing === index ? null : index)} className="rounded-lg p-2 text-secondary hover:bg-white focus-visible:outline-2 focus-visible:outline-secondary"><Icon name="edit" /></button>
              <button type="button" aria-label={`Xóa ${title}`} onClick={() => { onRemove(index); setEditing(current => current === index ? null : current !== null && current > index ? current - 1 : current); }} className="rounded-lg px-2 py-2 text-xs font-medium text-error hover:bg-error-container">Xóa</button>
            </div>
          </div>
          {editing === index ? <div className="mt-4 space-y-3 border-t border-outline-variant/40 pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map(field => <label key={field.key} className={`flex min-w-0 flex-col gap-1.5 ${field.key === "details" ? "sm:col-span-2" : ""}`}>
                <span className="text-xs font-medium text-on-surface-variant">{field.label}</span>
                {field.key === "details"
                  ? <textarea rows={3} maxLength={500} value={row[field.key] || ""} onChange={event => onChange(index, field.key, event.target.value)} className="w-full resize-y rounded-lg border border-outline-variant/70 bg-white px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15" />
                  : <input maxLength={500} value={row[field.key] || ""} onChange={event => onChange(index, field.key, event.target.value)} className="w-full rounded-lg border border-outline-variant/70 bg-white px-3 py-2 text-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/15" />}
              </label>)}
            </div>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">Xong</button>
          </div> : <div className="mt-2 space-y-1 text-sm text-on-surface-variant">
            {row.organization && <p className="break-words">{row.organization}</p>}
            {row.period && <p className="text-xs font-medium text-secondary">{row.period}</p>}
            {row.details && <p className="whitespace-pre-wrap break-words leading-relaxed">{row.details}</p>}
          </div>}
        </article>;
      })}
    </div>
    <button type="button" onClick={() => { onAdd(); setEditing(rows.length); }} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-secondary/40 px-3 py-2 text-xs font-semibold text-secondary hover:bg-secondary-fixed/30"><Icon name="add" />{addLabel}</button>
  </div>;
}
