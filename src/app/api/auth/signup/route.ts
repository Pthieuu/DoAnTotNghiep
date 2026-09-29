import { createClient } from "@/lib/supabase/server";
import { checkRequest, credentials, json } from "@/lib/auth-http";

export async function POST(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  const input = await credentials(request);
  if (!input || input.name.length < 2 || input.name.length > 80 || input.password.length < 12) {
    return json({ error: "Enter your name (2–80 characters), a valid email, and a password of 12–128 characters." }, 400);
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email, password: input.password,
      options: { data: { full_name: input.name } },
    });
    if (error) return json({ error: error.status === 429 ? "Too many attempts. Please try again later." : "Unable to create your account. Try signing in or use another email and a stronger password." }, error.status === 429 ? 429 : 400);
    if (data.session) return json({ redirect: "/dashboard" });
    return json({ message: "Check your inbox to confirm your email. If you already have an account, sign in instead." });
  } catch {
    return json({ error: "Registration is temporarily unavailable. Please try again." }, 503);
  }
}
