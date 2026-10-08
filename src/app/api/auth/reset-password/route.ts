import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";

export async function POST(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  const body = await request.json().catch(() => null);
  if (!body || !body.email || typeof body.email !== "string") {
    return json({ error: "Enter a valid email address." }, 400);
  }
  try {
    const supabase = await createClient();
    const origin = request.headers.get("origin") || new URL(request.url).origin;
    const { error } = await supabase.auth.resetPasswordForEmail(body.email, {
      redirectTo: `${origin}/auth/confirm?next=/update-password`,
    });
    if (error) {
      console.error("Supabase Reset Password Error:", error);
      return json({ error: error.message }, error.status || 400);
    }
    return json({ message: "Password reset link sent! Check your email." });
  } catch {
    return json({ error: "Service temporarily unavailable. Please try again." }, 503);
  }
}
