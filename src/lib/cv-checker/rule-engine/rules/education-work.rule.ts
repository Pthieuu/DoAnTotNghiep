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
    const matchedAlias = school.aliases.find((alias) =>
      text.toLowerCase().includes(alias.toLowerCase())
    );

    if (matchedAlias) {
      const hasFullCanonical = text.includes(school.canonicalJa);
      const hasSchoolName = text.includes(school.aliases[0]);
      const hasFaculty = school.facultyJa ? text.includes(school.facultyJa) : true;

      if (!hasFullCanonical && (!hasSchoolName || !hasFaculty)) {
        issues.push({
          id: `EW-SCHOOL-${school.code}`,
          section: "education_work",
          severity: "major",
          ruleCode: `RULE_SCHOOL_${school.code}_NONCANONICAL`,
          title: `Tên trường ${school.nameVi} nên ghi đầy đủ tên khoa tiếng Nhật`,
          problemVi: `CV có nhắc đến ${matchedAlias} nhưng chưa ghi rõ đầy đủ tên trường và khoa bằng tiếng Nhật.`,
          whyWrongVi: "Ghi đầy đủ tên trường và chuyên khoa bằng tiếng Nhật giúp nhà tuyển dụng dễ dàng tra cứu chương trình đào tạo và đối chiếu hồ sơ.",
          solutionVi: `Bạn nên ghi rõ: ${school.canonicalJa}`,
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
        title: "Nên thêm chữ '以上' ở dòng cuối phần học vấn / kinh nghiệm",
        problemVi: "Phần 学歴・職歴 chưa có chữ '以上' ở dòng cuối cùng bên phải.",
        whyWrongVi: "Trong hồ sơ tiếng Nhật (履歴書), từ 以上 (nghĩa là kết thúc danh sách) ở dòng cuối cùng giúp xác nhận toàn bộ quá trình học tập và làm việc đã được liệt kê đầy đủ.",
        solutionVi: "Bạn nên thêm chữ '以上' căn sát lề phải ở dòng cuối cùng của bảng 学歴・職歴.",
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
      title: "Nên dùng '卒業予定' cho sinh viên dự kiến tốt nghiệp",
      problemVi: "CV đang dùng từ '卒業見込み' cho mốc thời gian tốt nghiệp.",
      whyWrongVi: "Với ứng viên đang đi học và sắp tốt nghiệp, nhà tuyển dụng Nhật thường quen thuộc với cách viết '卒業予定' để chỉ thời gian dự kiến ra trường.",
      solutionVi: "Bạn nên điều chỉnh '卒業見込み' thành '卒業予定'. Ví dụ: 2026年06月　フォンドン大学／ソフトウェアサイエンス学部　卒業予定",
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
          title: "Công ty thực tập nên ghi rõ loại hình doanh nghiệp",
          problemVi: `Dòng kinh nghiệm '${matchStr.slice(0, 40)}...' chưa ghi kèm loại hình doanh nghiệp (株式会社, 有限会社...).`,
          whyWrongVi: "Ghi đầy đủ tiền tố hoặc hậu tố pháp nhân (ví dụ: 株式会社ABC thay vì chỉ viết ABC) giúp thể hiện tính chính xác và trang trọng.",
          solutionVi: "Bạn nên thêm loại hình doanh nghiệp (như 株式会社 hoặc 有限会社) trước hoặc sau tên công ty.",
          sourceQuoteJa: matchStr,
        });
      }
    }
  }

  return issues;
}
