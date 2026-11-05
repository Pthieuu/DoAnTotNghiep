import { CvIssue, CvParsedSections } from "../../types";
import prohibitedTermsConfig from "../../config/prohibited-terms.json";

export function checkCertificateRules(parsed: CvParsedSections): CvIssue[] {
  const issues: CvIssue[] = [];
  const text = parsed.certificatesText || parsed.rawText;

  // 1. Check prohibited terms (Specifically Credly)
  for (const item of prohibitedTermsConfig.prohibitedTerms) {
    if (item.category === "certificates") {
      const reg = new RegExp(item.pattern, item.flags || "");
      const match = reg.exec(parsed.rawText);
      if (match) {
        issues.push({
          id: `CERT-${item.ruleCode}`,
          section: "certificates",
          severity: item.severity as CvIssue["severity"],
          ruleCode: item.ruleCode,
          title: item.title,
          problemVi: item.problemVi,
          whyWrongVi: item.whyWrongVi,
          solutionVi: item.solutionVi,
          sourceQuoteJa: match[0],
        });
      }
    }
  }

  // 2. Check for vague or approximate scores without dates
  const vagueMatch = text.match(/(?:TOEIC|JLPT|日本語能力試験)\s*(\d{3}-\d{3}|レベル|相当)/i);
  if (vagueMatch) {
    issues.push({
      id: "CERT-VAGUE-SCORE",
      section: "certificates",
      severity: "major",
      ruleCode: "RULE_CERT_VAGUE_SCORE",
      title: "Nên ghi rõ điểm số và ngày thi thay vì điểm ước lượng",
      problemVi: `Chứng chỉ ghi '${vagueMatch[0]}' đang ở dạng khoảng ước lượng hoặc chưa có điểm chính thức.`,
      whyWrongVi: "Nhà tuyển dụng Nhật đánh giá cao thông tin minh bạch và có thể kiểm chứng. Thay vì ghi khoảng điểm ước chừng, bạn nên ghi số điểm thi thực tế kèm mốc thời gian đạt.",
      solutionVi: "Nếu đã có bằng: Bạn nên ghi rõ [Năm]年[Tháng]月 TOEIC [Điểm số]点 取得. Nếu đang ôn tập: Có thể ghi chú 'JLPT N3相当（自己評価）' và nêu tháng dự kiến thi.",
      sourceQuoteJa: vagueMatch[0],
    });
  }

  // 3. Check for dates on official certificates
  const certLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of certLines) {
    const isCertItem = /TOEIC|JLPT|日本語能力試験|基本情報技術者|応用情報技術者|AWS|Oracle/i.test(line);
    if (isCertItem && !/特になし/.test(line)) {
      const hasDate = /\d{4}\s*年\s*\d{1,2}\s*月/.test(line);
      const hasAcquired = /取得|合格/.test(line);
      if (!hasDate || !hasAcquired) {
        issues.push({
          id: `CERT-DATE-FORMAT-${line.slice(0, 10)}`,
          section: "certificates",
          severity: "minor",
          ruleCode: "RULE_CERT_MISSING_DATE_STATUS",
          title: "Nên bổ sung mốc thời gian và trạng thái 取得/合格 cho chứng chỉ",
          problemVi: `Dòng chứng chỉ '${line.slice(0, 45)}' chưa ghi rõ thời gian đạt hoặc trạng thái 取得/合格.`,
          whyWrongVi: "Mỗi chứng chỉ tiếng Nhật thường bắt đầu bằng cột mốc thời gian (Năm/Tháng) và kết thúc bằng chữ '取得' (đối với văn bằng) hoặc '合格' (đối với kỳ thi đỗ).",
          solutionVi: `Bạn nên điều chỉnh về cấu trúc: 2025年12月　${line}　合格 (hoặc 取得)`,
          sourceQuoteJa: line,
        });
      }
    }
  }

  // 4. Check if section is completely empty
  if (parsed.certificatesText && parsed.certificatesText.trim().length === 0) {
    issues.push({
      id: "CERT-EMPTY",
      section: "certificates",
      severity: "minor",
      ruleCode: "RULE_CERT_EMPTY_SECTION",
      title: "Mục 免許・資格 đang để trống",
      problemVi: "Mục bằng cấp / chứng chỉ hiện chưa có nội dung.",
      whyWrongVi: "CV tiếng Nhật thường hạn chế để trống các ô mục để tránh người đọc hiểu lầm là bỏ sót thông tin.",
      solutionVi: "Nếu chưa có chứng chỉ chính thức, bạn có thể ghi '特になし' hoặc tự đánh giá năng lực tiếng Nhật kèm dự kiến thời gian thi.",
      rewriteSampleJa: "特になし\n日本語能力試験 N3相当（自己評価）",
    });
  }

  return issues;
}
