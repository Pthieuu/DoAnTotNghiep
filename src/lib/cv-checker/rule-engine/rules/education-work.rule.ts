import { CvIssue, CvParsedSections } from "../../types";
import schoolRegistry from "../../config/school-registry.json";
import prohibitedTermsConfig from "../../config/prohibited-terms.json";

export function checkEducationWorkRules(parsed: CvParsedSections): CvIssue[] {
  const issues: CvIssue[] = [];
  const text = parsed.educationWorkText || parsed.rawText;

  // 1. Check prohibited terms in Education/Work
  for (const item of prohibitedTermsConfig.prohibitedTerms) {
    if (item.category === "education_work") {
      const reg = new RegExp(item.pattern, item.flags || "");
      const match = reg.exec(text);
      if (match) {
        issues.push({
          id: `EW-${item.ruleCode}`,
          section: "education_work",
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

  // 2. Check canonical university names
  for (const school of schoolRegistry.schools) {
    // Check if the CV mentions this school's aliases
    const matchedAlias = school.aliases.find((alias) =>
      text.toLowerCase().includes(alias.toLowerCase())
    );

    if (matchedAlias) {
      // Check if it has the canonical full Japanese name + faculty
      const hasFullCanonical = text.includes(school.canonicalJa);
      const hasSchoolName = text.includes(school.aliases[0]);
      const hasFaculty = school.facultyJa ? text.includes(school.facultyJa) : true;

      if (!hasFullCanonical && (!hasSchoolName || !hasFaculty)) {
        issues.push({
          id: `EW-SCHOOL-${school.code}`,
          section: "education_work",
          severity: "major",
          ruleCode: `RULE_SCHOOL_${school.code}_NONCANONICAL`,
          title: `Tên trường ${school.nameVi} chưa chuẩn hoá tiếng Nhật`,
          problemVi: `CV có nhắc đến ${matchedAlias} nhưng chưa ghi đúng chuẩn tên trường và khoa tiếng Nhật.`,
          whyWrongVi: "Các trường đại học đối tác của doanh nghiệp Nhật có quy ước tên gọi và tên khoa chính thức bằng tiếng Nhật để nhà tuyển dụng dễ dàng tra cứu và đối chiếu bằng cấp.",
          solutionVi: `Ghi chính xác: ${school.canonicalJa}`,
          sourceQuoteJa: matchedAlias,
          rewriteSampleJa: school.canonicalJa,
        });
      }
    }
  }

  // 3. Check for '以上' ending in education/career
  if (parsed.educationWorkText) {
    const hasIjyou = /以上\s*$/.test(parsed.educationWorkText.trim()) || /以上/.test(parsed.educationWorkText);
    if (!hasIjyou) {
      issues.push({
        id: "EW-IJYOU",
        section: "education_work",
        severity: "major",
        ruleCode: "RULE_MISSING_IJYOU",
        title: "Thiếu chữ '以上' ở cuối phần Học vấn / Sự nghiệp",
        problemVi: "Phần 学歴・職歴 không có chữ '以上' ở dòng cuối cùng bên phải.",
        whyWrongVi: "Trong quy chuẩn 履歴書 của Nhật Bản, chữ 以上 (Nghĩa là: Hết / Trên đây là toàn bộ) là bắt buộc ở dòng cuối để xác nhận không còn lịch sử nào bị bỏ sót hay viết thêm sau đó.",
        solutionVi: "Thêm một dòng cuối cùng trong bảng 学歴・職歴: ghi chữ '以上' căn sát lề phải.",
        rewriteSampleJa: "                                        以上",
      });
    }
  }

  // 4. Check graduation wording: '卒業見込み' vs '卒業予定'
  if (/卒業見込(?:み)?/.test(text)) {
    issues.push({
      id: "EW-SOTSUGYOU",
      section: "education_work",
      severity: "minor",
      ruleCode: "RULE_SOTSUGYOU_YOTEI",
      title: "Nên dùng '卒業予定' thay vì '卒業見込み'",
      problemVi: "CV đang dùng từ '卒業見込み' cho dòng năm tốt nghiệp dự kiến.",
      whyWrongVi: "Theo cẩm nang hướng dẫn NiX, dòng ghi mốc thời gian tốt nghiệp đại học sắp tới nên dùng thống nhất '卒業予定' (hoặc '現在に至る' cho công việc).",
      solutionVi: "Thay thế '卒業見込み' thành '卒業予定'. Ví dụ: 2026年06月　フォンドン大学／ソフトウェアサイエンス学部　卒業予定",
      sourceQuoteJa: "卒業見込み",
      rewriteSampleJa: "卒業予定",
    });
  }

  // 5. Check internship company format
  const internMatch = text.match(/(?:インターンシップ|インターン|実習|実務経験)[^\n\r]*/g);
  if (internMatch && internMatch.length > 0) {
    for (const matchStr of internMatch) {
      const hasCompanyForm = /株式会社|有限会社|合同会社|Corporation|Co\.,\s*Ltd/i.test(matchStr);
      if (!hasCompanyForm && !/なし|特になし/.test(matchStr)) {
        issues.push({
          id: "EW-INTERN-FORM",
          section: "education_work",
          severity: "minor",
          ruleCode: "RULE_INTERN_COMPANY_TYPE",
          title: "Công ty thực tập chưa ghi rõ loại hình doanh nghiệp",
          problemVi: `Dòng kinh nghiệm '${matchStr.slice(0, 40)}...' chưa ghi rõ tiền tố/hậu tố pháp nhân (株式会社, 有限会社...).`,
          whyWrongVi: "Khi ghi công ty thực tập, cần ghi đầy đủ tên pháp lý (ví dụ: 株式会社ABC thay vì chỉ viết ABC) để thể hiện sự tôn trọng và chính xác.",
          solutionVi: "Thêm loại hình pháp nhân (株式会社 hoặc 有限会社) trước hoặc sau tên công ty thực tập.",
          sourceQuoteJa: matchStr,
        });
      }
    }
  }

  return issues;
}
