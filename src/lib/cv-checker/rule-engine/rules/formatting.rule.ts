import { CvIssue, CvParsedSections } from "../../types";

export function checkFormattingRules(parsed: CvParsedSections): CvIssue[] {
  const issues: CvIssue[] = [];
  const text = parsed.rawText;

  // 1. Check for ChatGPT / Markdown syntax leakage
  const markdownMatches: string[] = [];
  if (/\*\*[^*]+\*\*/.test(text)) markdownMatches.push("** (in đậm markdown)");
  if (/^#{1,4}\s+/m.test(text)) markdownMatches.push("## (tiêu đề markdown)");
  if (/```[\s\S]*?```/.test(text)) markdownMatches.push("``` (code block)");
  if (/\[.+?\]\(https?:\/\/[^\s)]+\)/.test(text)) markdownMatches.push("[text](link) markdown link");

  if (markdownMatches.length > 0) {
    issues.push({
      id: "FMT-MARKDOWN-LEAK",
      section: "formatting_layout",
      severity: "critical",
      ruleCode: "RULE_MARKDOWN_LEAK",
      title: "Còn sót các ký tự định dạng Markdown trong văn bản",
      problemVi: `CV có chứa các ký tự định dạng markdown chưa được làm sạch: ${markdownMatches.join(", ")}.`,
      whyWrongVi: "Nhà tuyển dụng Nhật rất chú ý đến tính chỉn chu. Các ký hiệu định dạng markdown chưa được làm sạch có thể khiến người đọc nghĩ rằng bạn sao chép trực tiếp mà chưa kiểm tra lại kỹ lưỡng.",
      solutionVi: "Bạn nên xóa bỏ các ký hiệu `**`, `##`, `*` và sử dụng công cụ định dạng chữ đậm/nhạt trực tiếp trong trình soạn thảo Word.",
    });
  }

  // 2. Check for half-width punctuation in Japanese sentences
  const japaneseText = parsed.jikoPrText + " " + parsed.shibouDoukiText;
  const halfCommaMatch = japaneseText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF],[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
  const halfPeriodMatch = japaneseText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]\.[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);

  if (halfCommaMatch || halfPeriodMatch) {
    issues.push({
      id: "FMT-PUNCTUATION",
      section: "formatting_layout",
      severity: "minor",
      ruleCode: "RULE_JAPANESE_PUNCTUATION",
      title: "Nên dùng dấu câu toàn độ rộng (、 và 。) trong câu tiếng Nhật",
      problemVi: "Trong các đoạn tiếng Nhật, đang dùng dấu phẩy (,) hoặc dấu chấm (.) của bảng chữ cái Latinh.",
      whyWrongVi: "Quy tắc chính tả tiếng Nhật chuẩn dùng dấu phẩy toàn độ rộng (、- touten) và dấu chấm toàn độ rộng (。- kuten) để câu văn liền mạch và chuẩn mực.",
      solutionVi: "Bạn nên thay thế dấu ',' bằng '、' và dấu '.' bằng '。' trong các câu tiếng Nhật.",
    });
  }

  // 3. Check for half-width parentheses in Japanese headings
  const halfParenInHeading = parsed.rawText.match(/(?:自己PR|志望動機|得意科目|資格)\s*\([^\)]*\)/);
  if (halfParenInHeading) {
    issues.push({
      id: "FMT-PARENTHESES",
      section: "formatting_layout",
      severity: "minor",
      ruleCode: "RULE_HALF_WIDTH_PARENS",
      title: "Nên dùng dấu ngoặc đơn toàn độ rộng （） cho văn bản tiếng Nhật",
      problemVi: `Tìm thấy dấu ngoặc đơn nửa độ rộng: '${halfParenInHeading[0]}'.`,
      whyWrongVi: "Trong văn bản tiếng Nhật, dấu ngoặc đơn nên là toàn độ rộng '（' và '）' để bố cục hàng chữ và khoảng cách các ký tự được đều đặn.",
      solutionVi: "Bạn nên thay '()' bằng '（）' toàn độ rộng.",
      sourceQuoteJa: halfParenInHeading[0],
      rewriteSampleJa: halfParenInHeading[0].replace("(", "（").replace(")", "）"),
    });
  }

  return issues;
}
