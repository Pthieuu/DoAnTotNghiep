import type { CvData, CvItem } from "@/lib/cv-schema";
import type { CvParsedSections } from "@/lib/cv-checker/types";

export const INTERVIEW_SESSION_STORAGE_KEY = "aizuchi_interview_session_context";
export const INTERVIEW_PREFS_STORAGE_KEY = "aizuchi_interview_quick_prefs";

export interface InterviewSessionContext {
  cvFileName: string;
  companyName: string;
  jobPosition: string;
  jlptTarget: string;
  companyUrl?: string;
  jobDescription?: string;
  cvAnalysisId?: string;
  cvData?: CvData | null;
  checkedAt: string;
  hasCriticalIssues?: boolean;
}

export interface InterviewQuickPrefs {
  interviewType?: string;
  interviewLanguage?: string;
  questionCount?: number;
}

/**
 * Saves interview session context into sessionStorage.
 * Wrapped in try/catch to avoid throwing when storage is disabled or quota exceeded.
 */
export function saveInterviewSessionContext(data: InterviewSessionContext): boolean {
  if (typeof window === "undefined") return false;
  try {
    sessionStorage.setItem(INTERVIEW_SESSION_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error("Failed to save interview session context to sessionStorage:", err);
    return false;
  }
}

/**
 * Reads interview session context from sessionStorage.
 */
export function getInterviewSessionContext(): InterviewSessionContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(INTERVIEW_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.cvFileName) return null;
    return parsed as InterviewSessionContext;
  } catch (err) {
    console.error("Failed to read interview session context from sessionStorage:", err);
    return null;
  }
}

/**
 * Clears the stored interview session context.
 */
export function clearInterviewSessionContext(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(INTERVIEW_SESSION_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear interview session context from sessionStorage:", err);
  }
}

/**
 * Saves recent user interview quick preferences.
 */
export function saveInterviewQuickPrefs(prefs: InterviewQuickPrefs): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(INTERVIEW_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error("Failed to save interview quick prefs to sessionStorage:", err);
  }
}

/**
 * Retrieves recent user interview quick preferences.
 */
export function getInterviewQuickPrefs(): InterviewQuickPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(INTERVIEW_PREFS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InterviewQuickPrefs;
  } catch (err) {
    console.error("Failed to read interview quick prefs from sessionStorage:", err);
    return null;
  }
}

/**
 * Maps question count to estimated duration string.
 */
export function estimateInterviewDuration(count: number): string {
  switch (count) {
    case 4:
      return "~7–10 phút";
    case 5:
      return "~8–12 phút";
    case 6:
      return "~10–15 phút";
    case 8:
      return "~15–20 phút";
    case 10:
      return "~20–25 phút";
    case 15:
      return "~30–40 phút";
    default:
      return `~${Math.round(count * 1.8)}–${Math.round(count * 2.5)} phút`;
  }
}

/**
 * Converts segmented CV sections from CV Checker into validated CvData schema
 * so that interview generation can cite real evidence directly without re-upload.
 */
export function convertParsedSectionsToCvData(parsed: CvParsedSections): CvData {
  const clean = (s?: string) => s?.trim() || "";
  const lines = (text: string) => text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  const personalLines = lines(clean(parsed.personalInfoText));
  const fullName = personalLines.length > 0 ? personalLines[0].slice(0, 100) : null;

  const educationWork = clean(parsed.educationWorkText);
  const education: CvItem[] = educationWork
    ? [
      {
        title: "Học vấn & Quá trình làm việc (学歴・職歴)",
        organization: null,
        period: null,
        description: educationWork.slice(0, 2000),
        evidence: [{ text: educationWork.slice(0, 100), page: null }],
      },
    ]
    : [];

  const certsText = clean(parsed.certificatesText);
  const certificates: CvItem[] = certsText
    ? [
      {
        title: "Bằng cấp & Chứng chỉ (免許・資格)",
        organization: null,
        period: null,
        description: certsText.slice(0, 1000),
        evidence: [{ text: certsText.slice(0, 100), page: null }],
      },
    ]
    : [];

  const skillsText = clean(parsed.skillsHobbiesText);
  const skillsList = lines(skillsText)
    .map((s) => s.replace(/^[•\-\*]\s*/, "").slice(0, 80))
    .slice(0, 25);

  const jikoPr = clean(parsed.jikoPrText);
  const shibouDouki = clean(parsed.shibouDoukiText);

  return {
    fullName,
    summary: jikoPr ? jikoPr.slice(0, 1500) : null,
    motivation: shibouDouki ? shibouDouki.slice(0, 1500) : null,
    motivationEvidence: shibouDouki ? [{ text: shibouDouki.slice(0, 100), page: null }] : [],
    expectations: null,
    expectationsEvidence: [],
    education,
    experience: [],
    projects: [],
    skills: skillsList.length > 0 ? skillsList : ["Kỹ năng chuyên môn", "Tiếng Nhật giao tiếp"],
    languages: [{ name: "Tiếng Nhật", level: null, evidence: [] }],
    certificates,
  };
}
