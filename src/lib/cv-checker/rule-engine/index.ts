import { CvIssue, CvParsedSections, TargetCompanyContext } from "../types";
import { checkPersonalInfoRules } from "./rules/personal-info.rule";
import { checkEducationWorkRules } from "./rules/education-work.rule";
import { checkCertificateRules } from "./rules/certificate.rule";
import { checkSkillsHobbiesRules } from "./rules/skills.rule";
import { checkFormattingRules } from "./rules/formatting.rule";

export function runRuleEngine(
  parsed: CvParsedSections,
  context: TargetCompanyContext = {}
): CvIssue[] {
  const issues: CvIssue[] = [];

  // Check section completeness
  for (const missing of parsed.missingHeadings) {
    issues.push({
      id: `MISSING-${missing}`,
      section: mapMissingHeadingToSection(missing),
      severity: "critical",
      ruleCode: "RULE_MISSING_SECTION",
      title: `Thiếu mục bắt buộc: ${missing}`,
      problemVi: `Không tìm thấy tiêu đề hoặc nội dung của mục '${missing}' trong CV.`,
      whyWrongVi: "Một bản 履歴書 hoàn chỉnh của Nhật Bản bắt buộc phải có đầy đủ các đề mục theo quy định.",
      solutionVi: `Bổ sung mục '${missing}' vào đúng vị trí theo mẫu CV chuẩn.`,
    });
  }

  // Run individual deterministic rules
  issues.push(...checkPersonalInfoRules(parsed, context));
  issues.push(...checkEducationWorkRules(parsed));
  issues.push(...checkCertificateRules(parsed));
  issues.push(...checkSkillsHobbiesRules(parsed));
  issues.push(...checkFormattingRules(parsed));

  return issues;
}

function mapMissingHeadingToSection(heading: string): CvIssue["section"] {
  if (/学歴|職歴/i.test(heading)) return "education_work";
  if (/免許|資格|賞罰/i.test(heading)) return "certificates";
  if (/趣味|得意/i.test(heading)) return "skills_hobbies";
  if (/自己PR/i.test(heading)) return "jiko_pr";
  if (/志望動機/i.test(heading)) return "shibou_douki";
  return "personal_info";
}

