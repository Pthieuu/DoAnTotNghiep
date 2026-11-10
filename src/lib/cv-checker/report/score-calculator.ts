import {
  ChecklistItemResult,
  CvCheckerReport,
  CvIssue,
  CvParsedSections,
  SectionKey,
  SectionScore,
  TargetCompanyContext,
} from "../types";
import { ISSUE_DEDUCTIONS } from "../virtual-cv";
import checklistRubric from "../config/checklist-rubric.json";
import { getScoreTier } from "../config/score-tier";
import { LlmAnalysisResult } from "../llm-analyzers";

const SECTION_WEIGHTS: Record<SectionKey, { weight: number; titleVi: string; titleJa: string }> = {
  personal_info: { weight: 0.15, titleVi: "Thông tin cá nhân & ảnh", titleJa: "個人情報・写真" },
  education_work: { weight: 0.15, titleVi: "Học vấn & kinh nghiệm", titleJa: "学歴・職歴" },
  certificates: { weight: 0.1, titleVi: "Bằng cấp & chứng chỉ", titleJa: "免許・資格" },
  skills_hobbies: { weight: 0.15, titleVi: "Kỹ năng sở trường", titleJa: "趣味・得意科目" },
  jiko_pr: { weight: 0.2, titleVi: "Tự PR bản thân", titleJa: "自己PR" },
  shibou_douki: { weight: 0.2, titleVi: "Động lực ứng tuyển", titleJa: "志望動機" },
  formatting_layout: { weight: 0.05, titleVi: "Hình thức & trình bày", titleJa: "フォーマット・体裁" },
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
      deduction += ISSUE_DEDUCTIONS[issue.severity];
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

    let evaluationVi = "Trình bày tốt, thông tin rõ ràng";
    if (calculatedScore < 50) evaluationVi = "Cần điều chỉnh lại mục này để tạo ấn tượng tốt hơn";
    else if (calculatedScore < 75) evaluationVi = "Có một số điểm nên lưu ý hoàn thiện thêm";
    else if (calculatedScore < 90) evaluationVi = "Khá tốt, có thể trau chuốt thêm văn phong";

    sections[secKey] = {
      key: secKey,
      ruleScoreWeight: (secKey === "jiko_pr" && llmResults.jikoPrResult) || (secKey === "shibou_douki" && llmResults.shibouDoukiResult) ? 0.4 : secKey === "education_work" && llmResults.workExpResult ? 0.6 : 1,
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

  const tier = getScoreTier(overallScore);
  const ratingVi = tier.label;

  // Build Top 3 Priorities
  const sortedIssues = [...allIssues].sort((a, b) => {
    const weight = { critical: 4, major: 3, minor: 2, manual_check: 1 };
    return weight[b.severity] - weight[a.severity];
  });

  const topPrioritiesVi = sortedIssues.slice(0, 3).map((issue) => {
    return `${issue.title}: ${issue.solutionVi}`;
  });

  if (topPrioritiesVi.length === 0) {
    topPrioritiesVi.push("Hồ sơ CV của bạn đã được trình bày rất tốt, không phát hiện điểm cần sửa gấp.");
  }

  // Build Checklist (retained for backend model compatibility if needed)
  const checklist: ChecklistItemResult[] = checklistRubric.checklistItems.map((item) => {
    const secIssues = sectionIssuesMap[item.section as SectionKey] || [];
    const hasCrit = secIssues.some((i) => i.severity === "critical");
    const hasMajor = secIssues.some((i) => i.severity === "major");
    const hasMinor = secIssues.some((i) => i.severity === "minor");

    if (item.id === 2) {
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "manual_check",
        detailVi: "Lưu ý kiểm tra ảnh thẻ: áo sơ mi hoặc vest có cổ, phông nền đơn sắc, không dùng ảnh chụp đời thường.",
      };
    }

    if (item.id === 1 && secIssues.some((i) => i.ruleCode === "RULE_FILE_NAMING")) {
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "warning",
        detailVi: "Tên file nên đặt kèm tên công ty ứng tuyển để dễ quản lý.",
      };
    }

    if (item.id === 7 && secIssues.some((i) => i.ruleCode === "RULE_CREDLY_BANNED")) {
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "fail",
        detailVi: "Nên bỏ các dòng Credly バッジ để mục này gọn và đúng trọng tâm hơn.",
      };
    }

    if (item.id === 12 && secIssues.some((i) => i.ruleCode === "RULE_MARKDOWN_LEAK")) {
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "fail",
        detailVi: "Nên làm sạch các ký tự định dạng markdown chưa xóa.",
      };
    }

    if (hasCrit) {
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "fail",
        detailVi: secIssues.find((i) => i.severity === "critical")?.problemVi || "Cần điều chỉnh",
      };
    }

    if (hasMajor) {
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "warning",
        detailVi: secIssues.find((i) => i.severity === "major")?.problemVi || "Nên lưu ý hoàn thiện",
      };
    }

    if (hasMinor) {
      return {
        id: item.id,
        labelVi: item.labelVi,
        labelJa: item.labelJa,
        section: item.section as SectionKey,
        status: "warning",
        detailVi: "Có điểm nhỏ có thể trau chuốt thêm.",
      };
    }

    return {
      id: item.id,
      labelVi: item.labelVi,
      labelJa: item.labelJa,
      section: item.section as SectionKey,
      status: "pass",
      detailVi: "Trình bày phù hợp.",
    };
  });

  const summaryVi =
    overallScore >= 85
      ? "Hồ sơ của bạn có chất lượng tốt, cấu trúc rõ ràng và đáp ứng tốt kỳ vọng của doanh nghiệp Nhật Bản."
      : overallScore >= 70
      ? "CV có nền tảng tốt, chỉ cần hoàn thiện thêm một số chi tiết về hình thức hoặc tăng chiều sâu cho phần 自己PR và 志望動機."
      : "CV còn một số điểm quan trọng cần điều chỉnh trước khi gửi tới nhà tuyển dụng Nhật Bản.";

  return {
    virtualCv: { originalText: parsed.rawText, sections: { personal_info: parsed.personalInfoText, education_work: parsed.educationWorkText, certificates: parsed.certificatesText, skills_hobbies: parsed.skillsHobbiesText, jiko_pr: parsed.jikoPrText, shibou_douki: parsed.shibouDoukiText, formatting_layout: parsed.otherText } },
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
