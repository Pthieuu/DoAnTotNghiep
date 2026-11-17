import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";
import { emptyCv, validateCv, type CvData } from "@/lib/cv-schema";
import { parseHandoff, toInterviewCv } from "@/lib/cv-checker/virtual-cv";
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
  const interviewType = body?.interviewType || "mixed";
  const interviewLanguage = body?.interviewLanguage || "vi";

  if (!body || !role || role.length > 160 || companyInput.length > 160 || jobDescriptionInput.length > 12000 || !["N5", "N4", "N3", "N2", "N1"].includes(String(level)) || ![4, 5, 6, 8, 10, 15].includes(Number(questionCount))) {
    return json({ error: "Invalid configuration. Check role, company, JD, JLPT level, and question count." }, 400);
  }
  if (!["technical", "behavioral", "mixed"].includes(String(interviewType))) {
    return json({ error: "Invalid interview type." }, 400);
  }
  if (!["ja", "vi"].includes(String(interviewLanguage))) {
    return json({ error: "Invalid interview language." }, 400);
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in to create an interview session." }, 401);

    let cvSnapshot: CvData = emptyCv;
    let cvId: string | null = null;

    if (body.checkerCv !== undefined) {
      const handoff = parseHandoff(body.checkerCv);
      if (!handoff) return json({ error: "Invalid CV data transferred from CV Checker. Please retry transfer." }, 400);
      cvSnapshot = toInterviewCv(handoff);
    } else if (body.cvData && validateCv(body.cvData)) {
      cvSnapshot = body.cvData as CvData;
    } else {
      const { data: cvRow, error: cvError } = await supabase.from("candidate_cvs")
        .select("id,file_name,confirmed_data,status")
        .eq("user_id", user.id).eq("status", "confirmed")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (cvError) return json({ error: "Could not load confirmed CV. Please check database configuration." }, 500);

      if (cvRow && validateCv(cvRow.confirmed_data)) {
        cvSnapshot = cvRow.confirmed_data as CvData;
        cvId = cvRow.id;
      } else if (body?.isManual === true) {
        cvSnapshot = emptyCv;
        cvId = null;
      } else {
        return json({ error: "Please review your CV or confirm CV information before creating an interview session." }, 409);
      }
    }

    const questions = await generateInterviewQuestions({
      cv: cvSnapshot,
      role,
      company: companyInput || null,
      jobDescription: jobDescriptionInput || null,
      level: String(level),
      count: Number(questionCount),
      interviewType: String(interviewType),
      interviewLanguage: String(interviewLanguage)
    });

    const { data: session, error: insertError } = await supabase.from("interview_sessions").insert({
      user_id: user.id,
      title: role,
      company: companyInput || null,
      level: String(level),
      target_role: role,
      job_description: jobDescriptionInput || null,
      question_count: Number(questionCount),
      interview_type: String(interviewType),
      interview_language: String(interviewLanguage),
      cv_id: cvId,
      cv_snapshot: cvSnapshot,
      questions,
      status: "in_progress",
    }).select("id,title,company,level,status,created_at,question_count").single();

    if (insertError) {
      console.error("Interview session create failed", { code: insertError.code, message: insertError.message });
      if (insertError.code === "42703" || insertError.code === "PGRST204" || insertError.code === "42P01" || insertError.code === "PGRST205") {
        return json({ error: "Database not migrated for interview sessions. Please run migration 202609300003_extend_interview_sessions.sql." }, 503);
      }
      return json({ error: "Could not save interview session. Check database permissions and retry." }, 500);
    }

    return json({ session }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create interview session.";
    console.error("Interview session generation failed", { reason: message });
    return json({ error: message }, 503);
  }
}
