import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";
import { validateCv, type CvData } from "@/lib/cv-schema";
import { generateInterviewQuestions } from "@/lib/interview-generation";

export const maxDuration = 150;

export async function POST(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const role = typeof body?.role === "string" ? body.role.trim() : "";
  const companyInput = typeof body?.company === "string" ? body.company.trim() : "";
  const jobDescriptionInput = typeof body?.jobDescription === "string" ? body.jobDescription.trim() : "";
  const level = body?.level;
  const questionCount = body?.questionCount;
  if (!body || !role || role.length > 160 || companyInput.length > 160 || jobDescriptionInput.length > 12000 || !["N5", "N4", "N3", "N2", "N1"].includes(String(level)) || ![4, 6, 8].includes(Number(questionCount))) {
    return json({ error: "Cấu hình không hợp lệ. Kiểm tra vị trí, công ty, JD, trình độ và số câu hỏi." }, 400);
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Vui lòng đăng nhập để tạo buổi phỏng vấn." }, 401);

    const { data: cvRow, error: cvError } = await supabase.from("candidate_cvs")
      .select("id,file_name,confirmed_data,status")
      .eq("user_id", user.id).eq("status", "confirmed")
      .order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (cvError) return json({ error: "Không thể tải CV đã xác nhận. Hãy kiểm tra cấu hình cơ sở dữ liệu." }, 500);
    if (!cvRow || !validateCv(cvRow.confirmed_data)) return json({ error: "Bạn cần xác nhận thông tin CV trước khi tạo buổi phỏng vấn." }, 409);

    const cvSnapshot = cvRow.confirmed_data as CvData;
    const questions = await generateInterviewQuestions({
      cv: cvSnapshot,
      role,
      company: companyInput || null,
      jobDescription: jobDescriptionInput || null,
      level: String(level),
      count: Number(questionCount),
    });

    const { data: session, error: insertError } = await supabase.from("interview_sessions").insert({
      user_id: user.id,
      title: role,
      company: companyInput || null,
      level: String(level),
      target_role: role,
      job_description: jobDescriptionInput || null,
      question_count: Number(questionCount),
      interview_language: "ja",
      cv_id: cvRow.id,
      cv_snapshot: cvSnapshot,
      questions,
      status: "in_progress",
    }).select("id,title,company,level,status,created_at,questions").single();

    if (insertError) {
      console.error("Interview session create failed", { code: insertError.code, message: insertError.message });
      if (insertError.code === "42703" || insertError.code === "PGRST204" || insertError.code === "42P01" || insertError.code === "PGRST205") {
        return json({ error: "Cơ sở dữ liệu chưa được cập nhật cho buổi phỏng vấn. Hãy chạy migration 202609300003_extend_interview_sessions.sql rồi thử lại." }, 503);
      }
      return json({ error: "Không thể lưu buổi phỏng vấn. Hãy kiểm tra quyền truy cập database rồi thử lại." }, 500);
    }

    return json({ session }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tạo được buổi phỏng vấn.";
    console.error("Interview session generation failed", { reason: message });
    return json({ error: message }, 503);
  }
}
