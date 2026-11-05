import { CvIssue, CvParsedSections } from "../../types";
import prohibitedTermsConfig from "../../config/prohibited-terms.json";

export function checkCertificateRules(parsed: CvParsedSections): CvIssue[] {
  const issues: CvIssue[] = [];
  const text = parsed.certificatesText || parsed.rawText;

  // 1. Check prohibited terms (Specifically Credly)
  for (const item of prohibitedTermsConfig.prohibitedTerms) {
    if (item.category === "certificates") {
      const reg = new RegExp(item.pattern, item.flags || "");
      const match = reg.exec(parsed.rawText); // check entire CV for Credly
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
  // Example: "TOEIC 400-500" or "N3レベル" without score/date
  const vagueMatch = text.match(/(?:TOEIC|JLPT|日本語能力試験)\s*(\d{3}-\d{3}|レベル|相当)/i);
  if (vagueMatch) {
    issues.push({
      id: "CERT-VAGUE-SCORE",
      section: "certificates",
      severity: "major",
      ruleCode: "RULE_CERT_VAGUE_SCORE",
      title: "Ghi điểm chứng chỉ chung chung, ước lượng",
      problemVi: `Chứng chỉ ghi '${vagueMatch[0]}' là dạng khoảng ước lượng hoặc chưa có bằng chính thức.`,
      whyWrongVi: "Doanh nghiệp Nhật yêu cầu tính minh bạch và khách quan. Không ghi khoảng điểm (như 400-500) mà phải ghi điểm thi thực tế kèm ngày cấp bằng.",
      solutionVi: "Nếu đã thi: Ghi rõ [Năm]年[Tháng]月 TOEIC [Điểm số]点 取得. Nếu chưa có bằng chính thức: Ghi rõ 'JLPT N3相当（自己評価）' và nêu kế hoạch thi cụ thể.",
      sourceQuoteJa: vagueMatch[0],
    });
  }

  // 3. Check for dates on official certificates
  // If text mentions TOEIC, JLPT, FE, AP, check if there is a YYYY年MM月 pattern
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
          title: "Thiếu tháng năm đạt chứng chỉ hoặc chữ 取得/合格",
          problemVi: `Dòng chứng chỉ '${line.slice(0, 45)}' chưa ghi rõ thời gian đạt hoặc trạng thái 取得/合格.`,
          whyWrongVi: "Trong mục 免許・資格, mỗi chứng chỉ cần có cột mốc thời gian rõ ràng (Năm/Tháng) ở đầu dòng và kết thúc bằng chữ '取得' (đối với chứng chỉ/bằng cấp) hoặc '合格' (đối với kỳ thi đỗ).",
          solutionVi: `Sửa thành dạng chuẩn: 2025年12月　${line}　合格 (hoặc 取得)`,
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
      problemVi: "Mục bằng cấp/chứng chỉ không có nội dung nào.",
      whyWrongVi: "CV Nhật Bản không bao giờ để ô trống. Nếu chưa có bằng cấp chính thức, vẫn phải ghi chú để chứng minh không phải bỏ sót.",
      solutionVi: "Nếu chưa có chứng chỉ: ghi '特になし' hoặc '日本語能力試験 N3相当（自己評価）' kèm dự kiến tháng thi.",
      rewriteSampleJa: "特になし\n日本語能力試験 N3相当（自己評価）",
    });
  }

  return issues;
}
