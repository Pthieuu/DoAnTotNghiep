export const WORK_EXPERIENCE_ANALYZER_PROMPT = `
Bạn là chuyên gia thẩm định CV tiếng Nhật (職務経歴書/履歴書) cho sinh viên CNTT Việt Nam ứng tuyển doanh nghiệp Nhật Bản.
Hãy đánh giá phần kinh nghiệm thực tập / dự án thực tế dưới đây:

<WORK_EXPERIENCE_TEXT>
{{WORK_EXPERIENCE_TEXT}}
</WORK_EXPERIENCE_TEXT>

Tiêu chí đánh giá kinh nghiệm thực tập:
1. Độ sâu của 業務内容 (Nội dung nghiệp vụ):
   - Có nêu rõ vị trí và phạm vi trách nhiệm không?
   - Có liệt kê công nghệ sử dụng thực tế không?
   - Có nêu vấn đề kỹ thuật phát sinh và cách giải quyết không?
   - Có số liệu kết quả định lượng cụ thể không?
2. Bẫy lỗi thường gặp:
   - Viết thụ động (chỉ ghi: "Tham gia phát triển dự án ABC", "Làm theo phân công của anh mentor").
   - Thiếu chi tiết kỹ thuật (không rõ bản thân chịu trách nhiệm module nào).

Trả về kết quả DUY NHẤT dưới dạng JSON với cấu trúc:
{
  "hasDepth": boolean,
  "hasMetrics": boolean,
  "score": number, // 0 - 100
  "strengthsVi": string[],
  "issues": [
    {
      "severity": "critical" | "major" | "minor",
      "ruleCode": string,
      "title": string,
      "problemVi": string,
      "whyWrongVi": string,
      "solutionVi": string,
      "sourceQuoteJa": string,
      "rewriteSampleJa": string
    }
  ],
  "suggestedRewriteJa": string
}
`;

