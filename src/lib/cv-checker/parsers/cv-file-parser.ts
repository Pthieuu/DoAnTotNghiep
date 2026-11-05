import "server-only";
import { CvParsedSections } from "../types";
import { segmentCvSections } from "./section-segmenter";

export async function parseCvFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<CvParsedSections> {
  const ext = fileName.toLowerCase().split(".").pop() || "pdf";
  const fileType: "pdf" | "docx" = ext === "docx" ? "docx" : "pdf";
  let extractedText = "";

  if (fileType === "pdf") {
    try {
      const worker = await import("pdf-parse/worker");
      const pdf = await import("pdf-parse");
      pdf.PDFParse.setWorker(worker.getPath());
      const parser = new pdf.PDFParse({ data: fileBuffer });
      const parsed = await parser.getText();
      await parser.destroy();
      extractedText = parsed.text || "";
    } catch (err) {
      console.error("PDF parse error:", err);
      // Fallback simple string extraction if pdf-parse fails on malformed structure
      extractedText = fileBuffer.toString("utf-8").replace(/[^\x20-\x7E\u3040-\u30FF\u4E00-\u9FAF\n\r]/g, " ");
    }
  } else {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = result.value || "";
    } catch (err) {
      console.error("DOCX parse error:", err);
      throw new Error("Không thể đọc tệp DOCX. Vui lòng kiểm tra lại định dạng tệp.");
    }
  }

  if (!extractedText.trim()) {
    throw new Error("Tệp CV không có văn bản hoặc là file ảnh scan chưa được OCR.");
  }

  return segmentCvSections(extractedText, fileName, fileType);
}

