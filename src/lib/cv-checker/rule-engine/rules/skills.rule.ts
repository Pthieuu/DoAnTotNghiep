import { CvIssue, CvParsedSections } from "../../types";

export function checkSkillsHobbiesRules(parsed: CvParsedSections): CvIssue[] {
  const issues: CvIssue[] = [];
  const text = parsed.skillsHobbiesText;

  if (!text || text.trim().length === 0) {
    return issues;
  }

  // Check if skills are categorized
  // Japanese IT CVs require clear technical grouping, e.g. 【バックエンド】, 【フロントエンド】, 【データベース】, 【ツール】
  const hasCategorization =
    /【|\[|［|Back-?end|Front-?end|Database|DB|クラウド|言語|フレームワーク|OS|Tools|インフラ/i.test(text);

  // If text is long (> 80 chars) but has no bullets, brackets, or categorized labels
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const isOneLongParagraph = lines.length <= 2 && text.length > 100 && !hasCategorization;

  if (isOneLongParagraph || !hasCategorization) {
    issues.push({
      id: "SKILL-CATEGORIZATION",
      section: "skills_hobbies",
      severity: "major",
      ruleCode: "RULE_SKILLS_UNCATEGORIZED",
      title: "Kỹ năng chuyên môn (得意科目) chưa được phân nhóm",
      problemVi: "Phần kỹ năng/môn học yêu thích đang viết thành văn bản liền mạch hoặc liệt kê hỗn tạp không có danh mục rõ ràng.",
      whyWrongVi: "Nhà tuyển dụng IT Nhật Bản chỉ có vài giây để lướt CV. Họ cần nhìn thấy ngay bạn thành thạo mảng nào (Backend, Frontend, Database, Tool) thay vì phải đọc một đoạn văn dài để tìm từ khóa công nghệ.",
      solutionVi: "Phân loại rõ theo từng nhóm công nghệ: 【言語・バックエンド】, 【フロントエンド】, 【データベース・インフラ】, 【ツール】.",
      rewriteSampleJa:
        "【バックエンド】：Java (Spring Boot), Python (FastAPI)\n【フロントエンド】：React, Next.js, TypeScript\n【データベース】：PostgreSQL, MySQL\n【ツール・インフラ】：Git, Docker, AWS",
    });
  }

  return issues;
}

