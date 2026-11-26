import { NextRequest, NextResponse } from "next/server";
import { analyzeCv } from "@/lib/cv-checker";
import { createClient } from "@/lib/supabase/server";
import { checkRequest } from "@/lib/auth-http";

export const maxDuration = 60; // 60 seconds max execution time for AI analysis

export async function POST(req: NextRequest) {
  const failure = checkRequest(req);
  if (failure) return failure;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please sign in to review a CV." }, { status: 401 });
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Please select a CV file (PDF or DOCX) to review." },
        { status: 400 }
      );
    }

    // Limit 4MB
    const maxSizeBytes = 4 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: "File size exceeds the 4MB limit. Please compress or optimize your file." },
        { status: 400 }
      );
    }

    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "pdf" && ext !== "docx") {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload a .pdf or .docx file." },
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
        error: error.message || "An error occurred during CV review. Please try again.",
      },
      { status: 500 }
    );
  }
}

