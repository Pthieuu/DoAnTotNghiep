import { CvIssue, CvParsedSections, TargetCompanyContext } from "../../types";

export function checkPersonalInfoRules(
  parsed: CvParsedSections,
  context: TargetCompanyContext
): CvIssue[] {
  const issues: CvIssue[] = [];
  const text = parsed.personalInfoText || parsed.rawText.slice(0, 1500);

  // 1. Check Katakana dot separator
  // Japanese Katakana for foreign names should be segmented with "・" (nakaguro)
  const furiganaMatch = text.match(/(?:フリガナ|ふりがな|カタカナ)[:：\s]*([^\n\r,，]+)/i);
  if (furiganaMatch) {
    const rawFurigana = furiganaMatch[1].trim();
    const isKatakana = /^[\u30A0-\u30FF\s・]+$/.test(rawFurigana);
    if (isKatakana && rawFurigana.length >= 4) {
      if (!rawFurigana.includes("・") && (rawFurigana.includes(" ") || rawFurigana.length >= 6)) {
        issues.push({
          id: "PI-01",
          section: "personal_info",
          severity: "critical",
          ruleCode: "RULE_KATAKANA_DOT_MISSING",
          title: "Nên thêm dấu '・' ngăn cách trong tên phiên âm Katakana",
          problemVi: `Tên phiên âm '${rawFurigana}' chưa có dấu chấm giữa '・' để phân cách các từ.`,
          whyWrongVi: "Trong tiếng Nhật, tên phiên âm Katakana của người nước ngoài nên dùng dấu chấm giữa '・' để người đọc dễ dàng nhận diện họ, tên đệm và tên gọi.",
          solutionVi: "Bạn nên thêm dấu '・' vào giữa các âm tiết họ và tên (Ví dụ: レ・バオ・フック thay vì viết liền hoặc cách trống).",
          sourceQuoteJa: rawFurigana,
          rewriteSampleJa: rawFurigana.replace(/\s+/g, "・"),
        });
      }
    }
  }

  // 2. Check bilingual address order
  const addressMatch = text.match(/(?:現住所|住所|Address)[:：\s]*([^\n\r]+)/i);
  if (addressMatch) {
    const addr = addressMatch[1].trim();
    const hasVietnam = /ベトナム|Vietnam|Việt Nam/i.test(addr);
    const hasCity = /市|省|Hà Nội|Đà Nẵng|Hồ Chí Minh|Hanoi|Danang/i.test(addr);
    if (!hasVietnam && !hasCity) {
      issues.push({
        id: "PI-02",
        section: "personal_info",
        severity: "major",
        ruleCode: "RULE_ADDRESS_FORMAT",
        title: "Địa chỉ hiện tại nên ghi rõ theo thứ tự từ lớn đến nhỏ",
        problemVi: "Địa chỉ hiện tại chưa thể hiện rõ thông tin Quốc gia / Tỉnh thành phố.",
        whyWrongVi: "Nhà tuyển dụng Nhật thường quen đọc địa chỉ theo thứ tự từ đơn vị hành chính lớn nhất đến nhỏ nhất (Quốc gia → Tỉnh/Thành phố → Quận/Huyện → Phường/Xã → Số nhà).",
        solutionVi: "Bạn nên bổ sung địa chỉ theo thứ tự: [Tiếng Nhật] ベトナム国、ハノイ市、〇〇区... kèm dòng tiếng Việt bên dưới để đối chiếu thuận tiện.",
        sourceQuoteJa: addr,
      });
    }
  }

  // 3. Check update date (現在)
  const dateMatch = text.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*現在/);
  if (dateMatch) {
    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const day = parseInt(dateMatch[3], 10);
    const cvDate = new Date(year, month, day);
    const now = new Date();
    const diffDays = Math.round((now.getTime() - cvDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      issues.push({
        id: "PI-03",
        section: "personal_info",
        severity: "major",
        ruleCode: "RULE_OUTDATED_DATE",
        title: "Ngày cập nhật trên CV đã cách thời điểm hiện tại khá lâu",
        problemVi: `Ngày nộp/cập nhật trên CV đang ghi ngày ${dateMatch[0]}.`,
        whyWrongVi: "Nhà tuyển dụng Nhật thường chú ý đến tính cập nhật của hồ sơ. Một CV ghi ngày cách đây vài tháng có thể tạo cảm giác bạn đang dùng lại bản CV cũ.",
        solutionVi: `Bạn nên cập nhật ngày mới nhất: ${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, "0")}月${String(now.getDate()).padStart(2, "0")}日現在`,
        sourceQuoteJa: dateMatch[0],
        rewriteSampleJa: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, "0")}月${String(now.getDate()).padStart(2, "0")}日現在`,
      });
    } else if (diffDays < -30) {
      issues.push({
        id: "PI-03B",
        section: "personal_info",
        severity: "minor",
        ruleCode: "RULE_FUTURE_DATE",
        title: "Ngày cập nhật trên CV đang ở tương lai",
        problemVi: `Ngày ghi trên CV (${dateMatch[0]}) lớn hơn ngày thực tế.`,
        whyWrongVi: "Ngày trên CV nên là ngày bạn gửi hồ sơ hoặc ngày phỏng vấn dự kiến.",
        solutionVi: `Bạn nên điều chỉnh ngày về đúng ngày gửi hồ sơ.`,
        sourceQuoteJa: dateMatch[0],
      });
    }
  } else {
    issues.push({
      id: "PI-04",
      section: "personal_info",
      severity: "minor",
      ruleCode: "RULE_MISSING_CURRENT_DATE",
      title: "Nên bổ sung dòng ngày cập nhật hồ sơ (〇〇年〇〇月〇〇日現在)",
      problemVi: "Chưa thấy dòng ngày tháng cập nhật ở phần đầu CV.",
      whyWrongVi: "CV tiếng Nhật thường có ngày tháng ở góc trên bên phải để xác nhận thời điểm gửi hồ sơ gần nhất.",
      solutionVi: "Bạn nên bổ sung dòng: [Năm]年[Tháng]月[Ngày]日現在 ở phía trên cùng bên phải CV.",
    });
  }

  // 4. Check file naming convention
  if (parsed.fileName) {
    const rawName = parsed.fileName.replace(/\.[^/.]+$/, "");
    const hasCV = /_CV_|_履歴書_/i.test(rawName);
    const parts = rawName.split("_");
    const hasCompany = context.companyName
      ? rawName.toLowerCase().includes(context.companyName.toLowerCase())
      : parts.length >= 3;

    if (!hasCV || !hasCompany) {
      issues.push({
        id: "PI-05",
        section: "personal_info",
        severity: "minor",
        ruleCode: "RULE_FILE_NAMING",
        title: "Tên file CV nên đặt kèm tên công ty ứng tuyển",
        problemVi: `Tên file hiện tại là '${parsed.fileName}'.`,
        whyWrongVi: "Tên file gửi cho nhà tuyển dụng nên đặt rõ ràng kèm tên công ty để tránh thất lạc hồ sơ và giúp người nhận dễ lưu trữ.",
        solutionVi: `Bạn nên đổi tên file theo định dạng: [HọTên]_CV_${context.companyName || "[TênCôngTy]"}.${parsed.fileType} (Ví dụ: NguyenVanA_CV_${context.companyName || "Rakuten"}.${parsed.fileType})`,
      });
    }
  }

  return issues;
}
