import type { CvCheckerReport, IssueSeverity, SectionKey } from "./types";
import { emptyCv, type CvData } from "../cv-schema";

export const SECTION_KEYS: SectionKey[] = ["personal_info", "education_work", "certificates", "skills_hobbies", "jiko_pr", "shibou_douki", "formatting_layout"];
export const ISSUE_DEDUCTIONS: Record<IssueSeverity, number> = { critical: 25, major: 12, minor: 5, manual_check: 0 };
export type VirtualCv = { originalText: string; sections: Record<SectionKey, string> };
export type CvCorrection = { section: SectionKey; text: string; sourceQuote?: string };
export type CvHandoff = { version: 1; fileName: string; cv: VirtualCv; company: string; role: string };
export const HANDOFF_PREFIX = "aizuchi-cv-handoff:";

export function issueKey(section: SectionKey, id: string, index: number) { return `${section}-${id}-${index}`; }

// Rebuild from the original on every edit/undo, so one undo never discards another correction.
export function applyCorrections(original: VirtualCv, corrections: Record<string, CvCorrection>): VirtualCv {
  const sections = { ...original.sections };
  for (const correction of Object.values(corrections)) {
    const current = sections[correction.section];
    const quote = correction.sourceQuote?.trim();
    sections[correction.section] = quote && current.includes(quote)
      ? current.replace(quote, correction.text.trim())
      : !quote && (correction.section === "jiko_pr" || correction.section === "shibou_douki")
        ? correction.text.trim()
        : [current, correction.text.trim()].filter(Boolean).join("\n\n");
  }
  return { originalText: original.originalText, sections };
}

export function rescoreCv(report: CvCheckerReport, corrections: Record<string, CvCorrection>) {
  const sections = { ...report.sections };
  for (const key of SECTION_KEYS) {
    const section = report.sections[key];
    const recovered = section.issues.reduce((sum, issue, index) => sum + (corrections[issueKey(key, issue.id, index)] ? ISSUE_DEDUCTIONS[issue.severity] : 0), 0);
    // Keep the original AI contribution; recover only the rule-based component.
    const totalDeduction = section.issues.reduce((sum, issue) => sum + ISSUE_DEDUCTIONS[issue.severity], 0);
    const ruleGain = Math.max(0, 100 - totalDeduction + recovered) - Math.max(0, 100 - totalDeduction);
    const score = Math.min(100, Math.round(section.score + ruleGain * (section.ruleScoreWeight ?? 1)));
    sections[key] = { ...section, score, evaluationVi: score !== section.score ? "Điểm tham khảo sau chỉnh sửa; chưa được AI thẩm định lại." : section.evaluationVi };
  }
  return { sections, overallScore: Math.round(SECTION_KEYS.reduce((sum, key) => sum + sections[key].score * sections[key].weight, 0)) };
}

export function parseHandoff(value: unknown): CvHandoff | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<CvHandoff>;
  if (v.version !== 1 || typeof v.fileName !== "string" || v.fileName.length > 500 || typeof v.role !== "string" || v.role.length > 160 || typeof v.company !== "string" || v.company.length > 160) return null;
  if (!v.cv || typeof v.cv.originalText !== "string" || !v.cv.originalText.trim() || v.cv.originalText.length > 200000 || !v.cv.sections) return null;
  const sections = {} as Record<SectionKey, string>;
  for (const key of SECTION_KEYS) {
    const text = v.cv.sections[key];
    if (typeof text !== "string" || text.length > 100000) return null;
    sections[key] = text;
  }
  return { version: 1, fileName: v.fileName, role: v.role, company: v.company, cv: { originalText: v.cv.originalText, sections } };
}

export function toInterviewCv(handoff: CvHandoff): CvData {
  return {
    ...emptyCv,
    summary: handoff.cv.sections.jiko_pr || null,
    motivation: handoff.cv.sections.shibou_douki || null,
    motivationEvidence: handoff.cv.sections.shibou_douki ? [{ text: handoff.cv.sections.shibou_douki, page: null }] : [],
    checkerContext: handoff.cv,
  };
}
