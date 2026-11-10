import { NextRequest, NextResponse } from "next/server";
import { analyzeCv } from "@/lib/cv-checker";

export const maxDuration = 60; // 60 seconds max execution time for AI analysis

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Vui lòng chọn tệp CV (PDF hoặc DOCX) để kiểm tra." },
        { status: 400 }
      );
    }

    // Limit 10MB
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: "Dung lượng tệp vượt quá giới hạn 10MB. Vui lòng nén hoặc tối ưu dung lượng tệp." },
        { status: 400 }
      );
    }

    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "pdf" && ext !== "docx") {
      return NextResponse.json(
        { error: "Định dạng tệp không được hỗ trợ. Vui lòng chỉ tải lên tệp .pdf hoặc .docx." },
        { status: 400 }
      );
    }

    const companyName = (formData.get("companyName") as string) || undefined;
    const companyUrl = (formData.get("companyUrl") as string) || undefined;
    const jobDescription = (formData.get("jobDescription") as string) || undefined;
    const targetRole = (formData.get("targetRole") as string) || undefined;
    const targetJlpt = (formData.get("targetJlpt") as string) || undefined;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const report = await analyzeCv(buffer, file.name, {
      companyName,
      companyUrl,
      jobDescription,
      targetRole,
      targetJlpt,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error("CV Checker error:", error);
    return NextResponse.json(
      {
        error: error.message || "Đã xảy ra lỗi trong quá trình thẩm định CV. Vui lòng thử lại.",
      },
      { status: 500 }
    );
  }
}

