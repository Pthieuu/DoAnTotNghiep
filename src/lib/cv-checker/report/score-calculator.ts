import {
  ChecklistItemResult,
  CvCheckerReport,
  CvIssue,
  CvParsedSections,
  SectionKey,
  SectionScore,
  TargetCompanyContext,
} from "../types";
import checklistRubric from "../config/checklist-rubric.json";
import { LlmAnalysisResult } from "../llm-analyzers";

const SECTION_WEIGHTS: Record<SectionKey, { weight: number; titleVi: string; titleJa: string }> = {
  personal_info: { weight: 0.15, titleVi: "Thông tin cá nhân & Ảnh", titleJa: "個人情報・写真" },
  education_work: { weight: 0.15, titleVi: "Học vấn & Kinh nghiệm", titleJa: "学歴・職歴" },
  certificates: { weight: 0.1, titleVi: "Bằng cấp & Chứng chỉ", titleJa: "免許・資格" },
  skills_hobbies: { weight: 0.15, titleVi: "Kỹ năng & Môn học sở trường", titleJa: "趣味・得意科目" },
  jiko_pr: { weight: 0.2, titleVi: "Tự PR bản thân (STAR)", titleJa: "自己PR" },
  shibou_douki: { weight: 0.2, titleVi: "Động lực ứng tuyển (Phễu 4 tầng)", titleJa: "志望動機" },
  formatting_layout: { weight: 0.05, titleVi: "Định dạng & Trình bày", titleJa: "フォーマット・体裁" },
};

export function buildCvReport(
  parsed: CvParsedSections,
  ruleIssues: CvIssue[],
  llmResults: LlmAnalysisResult,
  context: TargetCompanyContext = {}
): CvCheckerReport {
  // Combine all issues
  const allIssues: CvIssue[] = [...ruleIssues];
  if (llmResults.jikoPrResult?.issues) allIssues.push(...llmResults.jikoPrResult.issues);
  if (llmResults.shibouDoukiResult?.issues) allIssues.push(...llmResults.shibouDoukiResult.issues);
  if (llmResults.workExpResult?.issues) allIssues.push(...llmResults.workExpResult.issues);

  // Group issues by section
  const sectionIssuesMap: Record<SectionKey, CvIssue[]> = {
    personal_info: [],
    education_work: [],
    certificates: [],
    skills_hobbies: [],
    jiko_pr: [],
    shibou_douki: [],
    formatting_layout: [],
  };

  for (const issue of allIssues) {
    if (sectionIssuesMap[issue.section]) {
      sectionIssuesMap[issue.section].push(issue);
    }
  }

  // Calculate scores per section
  const sections: Record<SectionKey, SectionScore> = {} as any;
  let overallScore = 0;

  for (const [secKey, config] of Object.entries(SECTION_WEIGHTS) as [
    SectionKey,
    { weight: number; titleVi: string; titleJa: string }
  ][]) {
    const issues = sectionIssuesMap[secKey];
    let deduction = 0;
    for (const issue of issues) {
      if (issue.severity === "critical") deduction += 25;
      else if (issue.severity === "major") deduction += 12;
      else if (issue.severity === "minor") deduction += 5;
    }

    let calculatedScore = Math.max(0, 100 - deduction);

    // Blend with LLM scores if available
    if (secKey === "jiko_pr" && llmResults.jikoPrResult) {
      calculatedScore = Math.round(calculatedScore * 0.4 + llmResults.jikoPrResult.score * 0.6);
    } else if (secKey === "shibou_douki" && llmResults.shibouDoukiResult) {
      calculatedScore = Math.round(calculatedScore * 0.4 + llmResults.shibouDoukiResult.score * 0.6);
    } else if (secKey === "education_work" && llmResults.workExpResult) {
      calculatedScore = Math.round(calculatedScore * 0.6 + llmResults.workExpResult.score * 0.4);
    }

    let evaluationVi = "Đạt tiêu chuẩn tốt";
    if (calculatedScore < 50) evaluationVi = "Chưa đạt yêu cầu, có lỗi nghiêm trọng";
    else if (calculatedScore < 75) evaluationVi = "Cần chỉnh sửa bổ sung các tiêu chí quan trọng";
    else if (calculatedScore < 90) evaluationVi = "Khá tốt, cần trau chuốt thêm văn phong";

    sections[secKey] = {
      key: secKey,
      titleVi: config.titleVi,
      titleJa: config.titleJa,
      weight: config.weight,
      score: calculatedScore,
      evaluationVi,
      issues,
    };

    overallScore += calculatedScore * config.weight;
  }

  overallScore = Math.round(overallScore);

  let ratingVi: CvCheckerReport["ratingVi"] = "Không đạt chuẩn";
  if (overallScore >= 90) ratingVi = "Xuất sắc";
  else if (overallScore >= 75) ratingVi = "Đạt yêu cầu";
  else if (overallScore >= 60) ratingVi = "Cần cải thiện";

  // Build Top 3 Priorities
  const sortedIssues = [...allIssues].sort((a, b) => {
    const weight = { critical: 4, major: 3, minor: 2, manual_check: 1 };
    return weight[b.severity] - weight[a.severity];
  });

  const topPrioritiesVi = sortedIssues.slice(0, 3).map((issue) => {
    return `[${issue.severity.toUpperCase()}] ${issue.title}: ${issue.solutionVi}`;
  });

  if (topPrioritiesVi.length === 0) {
    topPrioritiesVi.push("Hồ sơ CV của bạn đã đạt đầy đủ các quy chuẩn hình thức và nội dung cốt lõi của NiX!");
  }

  // Build Checklist
  const checklist: ChecklistItemResult[] = checklistRubric.checklistItems.map((item) => {
    const secIssues = sectionIssuesMap[item.section as SectionKey] || [];
    const hasCrit = secIssues.some((i) => i.severity === "critical");
    const hasMajor = secIssues.some((i) => i.severity === "major");
    const hasMinor = secIssues.some((i) => i.severity === "minor");

    // Specific item matching
    if (item.id === 2) {
      // Photo check
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "manual_check",
        detailVi: "Cần kiểm tra thủ công: Ảnh thẻ có mặc vest/áo sơ mi cổ cồn, nền xanh/trắng, không dùng ảnh selfie.",
      };
    }

    if (item.id === 1 && secIssues.some((i) => i.ruleCode === "RULE_FILE_NAMING")) {
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "warning",
        detailVi: "Tên file chưa đúng định dạng [HọTên]_CV_[TênCôngTy].pdf",
      };
    }

    if (item.id === 7 && secIssues.some((i) => i.ruleCode === "RULE_CREDLY_BANNED")) {
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "fail",
        detailVi: "CV có chứa chứng chỉ Credly bị cấm. Cần xóa ngay.",
      };
    }

    if (item.id === 12 && secIssues.some((i) => i.ruleCode === "RULE_MARKDOWN_LEAK")) {
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "fail",
        detailVi: "Phát hiện ký tự Markdown của AI/ChatGPT chưa được xóa.",
      };
    }

    if (hasCrit) {
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "fail",
        detailVi: secIssues.find((i) => i.severity === "critical")?.problemVi || "Chưa đạt tiêu chuẩn",
      };
    }

    if (hasMajor) {
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "warning",
        detailVi: secIssues.find((i) => i.severity === "major")?.problemVi || "Cần lưu ý chỉnh sửa",
      };
    }

    if (hasMinor) {
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "warning",
        detailVi: "Có điểm nhỏ cần trau chuốt thêm.",
      };
    }

    return {
      id: item.id,
      labelVi: item.labelVi,
      labelJa: item.labelJa,
      section: item.section as SectionKey,
      status: "pass",
      detailVi: "Đạt chuẩn yêu cầu.",
    };
  });

  const summaryVi =
    overallScore >= 85
      ? "Hồ sơ của bạn có chất lượng rất cao, cấu trúc chặt chẽ, tuân thủ tốt các quy chuẩn của NiX và doanh nghiệp Nhật Bản."
      : overallScore >= 70
      ? "CV có nền tảng tốt nhưng cần khắc phục các lỗi về hình thức hoặc bổ sung chiều sâu cho phần 自己PR và 志望動機."
      : "CV còn nhiều lỗi quy chuẩn quan trọng cần được sửa trước khi nộp cho nhà tuyển dụng Nhật Bản.";

  return {
    overallScore,
    ratingVi,
    summaryVi,
    topPrioritiesVi,
    sections,
    checklist,
    metadata: {
      fileName: parsed.fileName,
      fileSizeBytes: 0,
      fileType: parsed.fileType,
      analyzedAt: new Date().toISOString(),
      companyName: context.companyName,
      companyUrl: context.companyUrl,
      targetRole: context.targetRole,
    },
  };
}

