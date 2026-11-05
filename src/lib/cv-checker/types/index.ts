export type IssueSeverity = "critical" | "major" | "minor" | "manual_check";

export type SectionKey =
  | "personal_info"
  | "education_work"
  | "certificates"
  | "skills_hobbies"
  | "jiko_pr"
  | "shibou_douki"
  | "formatting_layout";

export interface CvIssue {
  id: string;
  section: SectionKey;
  severity: IssueSeverity;
  ruleCode: string;
  title: string;
  problemVi: string;
  whyWrongVi: string;
  solutionVi: string;
  sourceQuoteJa?: string;
  rewriteSampleJa?: string;
}

export interface SectionScore {
  key: SectionKey;
  titleVi: string;
  titleJa: string;
  weight: number;
  score: number; // 0 - 100
  evaluationVi: string;
  issues: CvIssue[];
}

export interface ChecklistItemResult {
  id: number;
  labelVi: string;
  labelJa: string;
  section: SectionKey;
  status: "pass" | "fail" | "warning" | "manual_check";
  detailVi: string;
}

export interface CvCheckerReport {
  overallScore: number; // 0 - 100
  ratingVi: "Rất tốt" | "Khá tốt" | "Cần chỉnh sửa thêm" | "Cần làm lại nhiều phần" | string;
  summaryVi: string;
  topPrioritiesVi: string[];
  sections: Record<SectionKey, SectionScore>;
  checklist: ChecklistItemResult[];
  metadata: {
    fileName: string;
    fileSizeBytes: number;
    fileType: "pdf" | "docx";
    analyzedAt: string;
    companyName?: string;
    companyUrl?: string;
    targetRole?: string;
  };
}

export interface CvParsedSections {
  rawText: string;
  fileName: string;
  fileType: "pdf" | "docx";
  personalInfoText: string;
  educationWorkText: string;
  certificatesText: string;
  skillsHobbiesText: string;
  jikoPrText: string;
  shibouDoukiText: string;
  otherText: string;
  detectedHeadings: string[];
  missingHeadings: string[];
}

export interface TargetCompanyContext {
  companyName?: string;
  companyUrl?: string;
  jobDescription?: string;
  targetRole?: string;
  targetJlpt?: string;
}

