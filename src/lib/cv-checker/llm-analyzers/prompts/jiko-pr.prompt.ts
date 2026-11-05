export const JIKO_PR_ANALYZER_PROMPT = `
Bạn là chuyên gia thẩm định CV tiếng Nhật (履歴書・職務経歴書) cho sinh viên CNTT Việt Nam ứng tuyển vào doanh nghiệp Nhật Bản (theo cẩm nang NiX Education).
Hãy phân tích mục 自己PR (Tự PR bản thân) dưới đây:

<JIKO_PR_TEXT>
{{JIKO_PR_TEXT}}
</JIKO_PR_TEXT>

Tiêu chuẩn đánh giá mục 自己PR:
1. Cấu trúc 3 phần bắt buộc:
   - Phần 1: Khái quát ngắn gọn thế mạnh cốt lõi (1-2 câu).
   - Phần 2: Minh chứng thực tế theo khung STAR (Situation -> Task -> Action -> Result) với số liệu cụ thể. Dự án cá nhân (個人開発/Project Atelier) PHẢI được lồng ghép tại đây để chứng minh sự chủ động và khả năng giải quyết vấn đề kỹ thuật.
   - Phần 3: Đóng góp dự kiến cho công ty nếu được tuyển dụng.
2. Bẫy lỗi thường gặp:
   - Nói chung chung (VD: "Tôi là người chăm chỉ, hòa đồng") mà không có hành động kỹ thuật thực tế để minh chứng.
   - Không có số liệu (metrics: giảm thời gian, tăng hiệu năng, số người dùng...).
   - Tách rời dự án cá nhân ra khỏi 自己PR làm mất đi bằng chứng thuyết phục.
   - Thiếu câu chốt về giá trị đóng góp cho doanh nghiệp.

Trả về kết quả DUY NHẤT dưới dạng JSON với cấu trúc:
{
  "isStarCompliant": boolean,
  "hasPersonalProject": boolean,
  "hasMetrics": boolean,
  "score": number, // Thang điểm 0 - 100
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
  "suggestedRewriteJa": string // Bản viết lại hoàn chỉnh đạt chuẩn NiX & chuẩn STAR bằng tiếng Nhật
}
`;

