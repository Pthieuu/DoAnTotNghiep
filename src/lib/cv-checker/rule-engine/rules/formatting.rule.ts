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
      title: "Phát hiện ký tự Markdown của AI/ChatGPT",
      problemVi: `CV có chứa các ký tự định dạng markdown chưa được làm sạch: ${markdownMatches.join(", ")}.`,
      whyWrongVi: "Lỗi này chứng minh ứng viên sao chép trực tiếp nội dung từ ChatGPT vào CV mà không biên tập lại. Nhà tuyển dụng Nhật Bản cực kỳ dị ứng với việc nộp CV cẩu thả như vậy và sẽ loại hồ sơ ngay lập tức.",
      solutionVi: "Xóa bỏ toàn bộ các ký hiệu `**`, `##`, `*` và định dạng văn bản thành chữ thường hoặc in đậm chuẩn của trình soạn thảo Word/Google Docs.",
    });
  }

  // 2. Check for half-width punctuation in Japanese sentences
  // e.g. Japanese text containing "." or "," instead of "。" or "、"
  const japaneseText = parsed.jikoPrText + " " + parsed.shibouDoukiText;
  const halfCommaMatch = japaneseText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF],[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);
  const halfPeriodMatch = japaneseText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]\.[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/);

  if (halfCommaMatch || halfPeriodMatch) {
    issues.push({
      id: "FMT-PUNCTUATION",
      section: "formatting_layout",
      severity: "minor",
      ruleCode: "RULE_JAPANESE_PUNCTUATION",
      title: "Dùng dấu câu nửa độ rộng (, .) trong câu tiếng Nhật",
      problemVi: "Trong các đoạn tiếng Nhật, đang dùng dấu phẩy (,) hoặc dấu chấm (.) của bảng chữ cái Latinh.",
      whyWrongVi: "Quy tắc chính tả tiếng Nhật chuẩn yêu cầu dùng dấu phẩy toàn độ rộng (、- touten) và dấu chấm toàn độ rộng (。- kuten).",
      solutionVi: "Thay thế dấu ',' bằng '、' và dấu '.' bằng '。' trong tất cả các câu tiếng Nhật.",
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
      title: "Dùng dấu ngoặc đơn nửa độ rộng () trong văn bản tiếng Nhật",
      problemVi: `Tìm thấy dấu ngoặc đơn '(' ')' nửa độ rộng trong ngữ cảnh tiếng Nhật: '${halfParenInHeading[0]}'.`,
      whyWrongVi: "Trong văn bản chuẩn Nhật (履歴書), dấu ngoặc đơn phải là toàn độ rộng '（' và '）' để không làm lệch bố cục hàng chữ.",
      solutionVi: "Thay '()' bằng '（）' toàn độ rộng.",
      sourceQuoteJa: halfParenInHeading[0],
      rewriteSampleJa: halfParenInHeading[0].replace("(", "（").replace(")", "）"),
    });
  }

  return issues;
}

