import { CvIssue, CvParsedSections, TargetCompanyContext } from "../../types";

export function checkPersonalInfoRules(
  parsed: CvParsedSections,
  context: TargetCompanyContext
): CvIssue[] {
  const issues: CvIssue[] = [];
  const text = parsed.personalInfoText || parsed.rawText.slice(0, 1500);

  // 1. Check Katakana dot separator
  // Japanese Katakana for foreign names should be segmented with "・" (nakaguro)
  // Look for Katakana strings that look like names (e.g. フリガナ / ふりがな followed by katakana)
  const furiganaMatch = text.match(/(?:フリガナ|ふりがな|カタカナ)[:：\s]*([^\n\r,，]+)/i);
  if (furiganaMatch) {
    const rawFurigana = furiganaMatch[1].trim();
    // check if it's katakana
    const isKatakana = /^[\u30A0-\u30FF\s・]+$/.test(rawFurigana);
    if (isKatakana && rawFurigana.length >= 4) {
      if (!rawFurigana.includes("・") && (rawFurigana.includes(" ") || rawFurigana.length >= 6)) {
        issues.push({
          id: "PI-01",
          section: "personal_info",
          severity: "critical",
          ruleCode: "RULE_KATAKANA_DOT_MISSING",
          title: "Thiếu dấu '・' phân tách trong tên Katakana",
          problemVi: `Tên Furigana '${rawFurigana}' không có dấu chấm giữa '・' để phân cách các từ.`,
          whyWrongVi: "Theo quy chuẩn viết CV tiếng Nhật (履歴書), tên người nước ngoài viết bằng Katakana bắt buộc phải dùng dấu chấm giữa '・' (nakaguro) ngăn cách họ, tên đệm và tên chính để người Nhật đọc đúng.",
          solutionVi: "Thêm dấu '・' vào giữa các âm tiết họ và tên (Ví dụ: レ・バオ・フック thay vì レ バオ フック hay レバオフック).",
          sourceQuoteJa: rawFurigana,
          rewriteSampleJa: rawFurigana.replace(/\s+/g, "・"),
        });
      }
    }
  }

  // 2. Check bilingual address order
  // Address should have both Japanese & Vietnamese components, starting with country/province
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
        title: "Địa chỉ hiện tại chưa đầy đủ hoặc thiếu song ngữ",
        problemVi: "Địa chỉ chưa thể hiện rõ Quốc gia / Tỉnh thành phố theo chuẩn song ngữ.",
        whyWrongVi: "Doanh nghiệp Nhật cần biết rõ địa bàn sinh sống của ứng viên ở Việt Nam. Thứ tự chuẩn Nhật Bản là từ đơn vị hành chính lớn nhất đến nhỏ nhất (Quốc gia → Tỉnh/Thành phố → Quận/Huyện → Phường/Xã → Số nhà).",
        solutionVi: "Viết địa chỉ theo cấu trúc chuẩn: [Tiếng Nhật] ベトナム国、ハノイ市、〇〇区、〇〇通り... [Tiếng Việt] Số ..., Phường ..., Quận ..., Hà Nội.",
        sourceQuoteJa: addr,
      });
    }
  }

  // 3. Check update date (現在)
  // Example: 2026年03月03日現在
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
        title: "Ngày cập nhật CV đã cũ (> 30 ngày)",
        problemVi: `Ngày nộp/cập nhật trên CV ghi ngày ${dateMatch[0]}, đã quá 30 ngày so với thời điểm hiện tại.`,
        whyWrongVi: "Nhà tuyển dụng Nhật đánh giá cao tính chỉn chu. Một CV nộp với ngày tháng cách đây vài tháng bị coi là tái sử dụng CV cũ hoặc không chuẩn bị kỹ cho đợt ứng tuyển này.",
        solutionVi: `Cập nhật ngày hiện tại: ${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, "0")}月${String(now.getDate()).padStart(2, "0")}日現在`,
        sourceQuoteJa: dateMatch[0],
        rewriteSampleJa: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, "0")}月${String(now.getDate()).padStart(2, "0")}日現在`,
      });
    } else if (diffDays < -30) {
      issues.push({
        id: "PI-03B",
        section: "personal_info",
        severity: "minor",
        ruleCode: "RULE_FUTURE_DATE",
        title: "Ngày cập nhật CV ở tương lai quá xa",
        problemVi: `Ngày nộp/cập nhật ${dateMatch[0]} lớn hơn ngày thực tế.`,
        whyWrongVi: "Ngày nộp CV nên là ngày gửi hồ sơ hoặc ngày phỏng vấn dự kiến.",
        solutionVi: `Điều chỉnh ngày về đúng ngày nộp hồ sơ.`,
        sourceQuoteJa: dateMatch[0],
      });
    }
  } else {
    issues.push({
      id: "PI-04",
      section: "personal_info",
      severity: "minor",
      ruleCode: "RULE_MISSING_CURRENT_DATE",
      title: "Thiếu dòng ngày cập nhật (〇〇年〇〇月〇〇日現在)",
      problemVi: "Không tìm thấy dòng ngày tháng cập nhật ở đầu CV.",
      whyWrongVi: "Quy chuẩn CV Nhật (履歴書) bắt buộc phải có ngày tháng ở góc trên bên phải để xác thực tính cập nhật của hồ sơ.",
      solutionVi: "Bổ sung dòng: [Năm]年[Tháng]月[Ngày]日現在 ở phía trên cùng bên phải CV.",
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
        title: "Tên file CV chưa chuẩn quy ước",
        problemVi: `Tên file hiện tại là '${parsed.fileName}'.`,
        whyWrongVi: "Theo hướng dẫn của NiX, tên file gửi cho nhà tuyển dụng cần đặt theo mẫu chuẩn để tránh thất lạc hồ sơ và thể hiện tính chuyên nghiệp.",
        solutionVi: `Đổi tên file thành: [HọTên]_CV_${context.companyName || "[TênCôngTy]"}.${parsed.fileType} (Ví dụ: NguyenVanA_CV_${context.companyName || "Rakuten"}.${parsed.fileType})`,
      });
    }
  }

  return issues;
}

