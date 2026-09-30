export type Evidence = { text: string; page: number | null };
export type CvItem = {
  title: string;
  organization: string | null;
  period: string | null;
  description: string | null;
  evidence: Evidence[];
};
export type CvData = {
  fullName: string | null;
  summary: string | null;
  motivation: string | null;
  motivationEvidence: Evidence[];
  expectations: string | null;
  expectationsEvidence: Evidence[];
  education: CvItem[];
  experience: CvItem[];
  projects: CvItem[];
  skills: string[];
  languages: { name: string; level: string | null; evidence: Evidence[] }[];
  certificates: CvItem[];
};

export const emptyCv: CvData = {
  fullName: null, summary: null, motivation: null, motivationEvidence: [],
  expectations: null, expectationsEvidence: [], education: [], experience: [], projects: [],
  skills: [], languages: [], certificates: [],
};

export function validateCv(value: unknown): value is CvData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  const textOrNull = (v: unknown) => v === null || typeof v === "string";
  const evidence = (v: unknown) => Array.isArray(v) && v.every((e) => e && typeof e.text === "string" && (e.page === null || Number.isInteger(e.page)));
  const items = (v: unknown) => Array.isArray(v) && v.every((x) => x && typeof x.title === "string" && textOrNull(x.organization) && textOrNull(x.period) && textOrNull(x.description) && evidence(x.evidence));
  return textOrNull(data.fullName) && textOrNull(data.summary) && textOrNull(data.motivation) && evidence(data.motivationEvidence) && textOrNull(data.expectations) && evidence(data.expectationsEvidence) && items(data.education) && items(data.experience) && items(data.projects) && items(data.certificates) && Array.isArray(data.skills) && data.skills.every((s) => typeof s === "string") && Array.isArray(data.languages) && data.languages.every((l) => l && typeof l.name === "string" && textOrNull(l.level) && evidence(l.evidence));
}

export function analysisNotes(data: CvData) {
  const notes: { type: "content"; section: string; message: string; evidence: Evidence[] }[] = [];
  data.projects.forEach((p, i) => {
    if (!p.description || !/\b(role|responsib|led|built|implemented|designed|developed|vai trò|phụ trách|thực hiện|thiết kế|担当|役割|開発|実装)\b/i.test(p.description))
      notes.push({ type: "content", section: `projects.${i}`, message: "Mô tả vai trò cá nhân hoặc phần việc bạn trực tiếp thực hiện để luyện câu hỏi đi sâu hơn.", evidence: p.evidence });
  });
  data.experience.forEach((x, i) => {
    if (!x.description) notes.push({ type: "content", section: `experience.${i}`, message: "Có thể bổ sung nhiệm vụ cụ thể để câu hỏi phỏng vấn bám sát trải nghiệm của bạn.", evidence: x.evidence });
  });
  return notes;
}
