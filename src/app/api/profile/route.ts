import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";
import { supabaseConfig } from "@/lib/supabase/config";

const levels = new Set(["N5", "N4", "N3", "N2", "N1"]);
const statuses = new Set(["student", "working"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maximum: number, required = false): value is string {
  return typeof value === "string" && value.length <= maximum && (!required || value.trim().length > 0);
}

export async function GET() {
  if (!supabaseConfig()) return json({ error: "Authentication is not configured yet. Follow docs/supabase-setup.md to connect Supabase." }, 503);

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Please sign in to view your profile." }, 401);

    const { data, error } = await supabase.from("candidate_profiles")
      .select("full_name,katakana,phone,summary,target,motivation,jlpt_level,employment_status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return json({ error: "Unable to load your profile." }, 500);
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
      typeof body.employmentStatus !== "string" || !statuses.has(body.employmentStatus)) {
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
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).select("full_name,katakana,phone,summary,target,motivation,jlpt_level,employment_status").single();

    if (error) return json({ error: "Unable to save your profile. Please try again." }, 500);
    return json({ profile: data });
  } catch {
    return json({ error: "Profile service is temporarily unavailable." }, 503);
  }
}
