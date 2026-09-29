import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";
import { supabaseConfig } from "@/lib/supabase/config";

const levels = new Set(["N5", "N4", "N3", "N2", "N1"]);
const statuses = new Set(["student", "working"]);
const jsonArrayLimits: Record<string, number> = { industries: 20, languages: 20, educationExperience: 30, technicalSkills: 50 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maximum: number, required = false): value is string {
  return typeof value === "string" && value.length <= maximum && (!required || value.trim().length > 0);
}

function isJsonArray(value: unknown, maxItems: number): value is Record<string, string>[] {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) =>
    isRecord(item) && Object.values(item).every((field) => isText(field, 500))
  );
}

function databaseErrorMessage(code: string | undefined) {
  if (code === "42P01" || code === "PGRST205") return "Chưa tạo bảng hồ sơ trong Supabase. Hãy chạy các migration 202609290002 và 202609290003 trong SQL Editor.";
  if (code === "42703" || code === "PGRST204") return "Supabase đang thiếu các cột hồ sơ mới. Hãy chạy migration 202609290003_expand_candidate_profile.sql trong SQL Editor.";
  return null;
}

export async function GET() {
  if (!supabaseConfig()) return json({ error: "Authentication is not configured yet. Follow docs/supabase-setup.md to connect Supabase." }, 503);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Please sign in to view your profile." }, 401);

    const { data, error } = await supabase.from("candidate_profiles")
      .select("full_name,katakana,phone,summary,target,motivation,jlpt_level,employment_status,industries,languages,education_experience,technical_skills")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return json({ error: databaseErrorMessage(error.code) || "Không thể tải hồ sơ. Hãy kiểm tra cấu hình bảng candidate_profiles trong Supabase." }, 500);
    return json({ profile: data });
  } catch {
    return json({ error: "Profile service is temporarily unavailable." }, 503);
  }
}

export async function PUT(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Please sign in to save your profile." }, 401);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid profile data." }, 400);
    }
    if (!isRecord(body) ||
      !isText(body.fullName, 120, true) || !isText(body.katakana, 120) ||
      !isText(body.email, 320) || body.email !== user.email ||
      !isText(body.phone, 40) || !isText(body.summary, 3000) ||
      !isText(body.target, 200) || !isText(body.motivation, 3000) ||
      typeof body.jlptLevel !== "string" || !levels.has(body.jlptLevel) ||
      typeof body.employmentStatus !== "string" || !statuses.has(body.employmentStatus) ||
      !Array.isArray(body.industries) || body.industries.length > jsonArrayLimits.industries || !body.industries.every((item) => isText(item, 100)) ||
      !isJsonArray(body.languages, jsonArrayLimits.languages) ||
      !isJsonArray(body.educationExperience, jsonArrayLimits.educationExperience) ||
      !isJsonArray(body.technicalSkills, jsonArrayLimits.technicalSkills)) {
      return json({ error: "Some profile fields are invalid. Check the field lengths and selected JLPT level." }, 400);
    }

    const { data, error } = await supabase.from("candidate_profiles").upsert({
      user_id: user.id,
      full_name: body.fullName.trim(),
      katakana: body.katakana.trim(),
      phone: body.phone.trim(),
      summary: body.summary.trim(),
      target: body.target.trim(),
      motivation: body.motivation.trim(),
      jlpt_level: body.jlptLevel,
      employment_status: body.employmentStatus,
      industries: body.industries,
      languages: body.languages,
      education_experience: body.educationExperience,
      technical_skills: body.technicalSkills,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).select("full_name,katakana,phone,summary,target,motivation,jlpt_level,employment_status,industries,languages,education_experience,technical_skills").single();

    if (error) return json({ error: databaseErrorMessage(error.code) || "Không thể lưu hồ sơ. Hãy kiểm tra quyền RLS và cấu hình bảng candidate_profiles trong Supabase." }, 500);
    return json({ profile: data });
  } catch {
    return json({ error: "Profile service is temporarily unavailable." }, 503);
  }
}
