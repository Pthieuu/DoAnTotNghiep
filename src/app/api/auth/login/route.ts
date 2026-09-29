import { createClient } from "@/lib/supabase/server";
import { checkRequest, credentials, json } from "@/lib/auth-http";

export async function POST(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  const input = await credentials(request);
  if (!input) return json({ error: "Enter a valid email and password." }, 400);
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error) {
      const message = error.status === 429 ? "Too many attempts. Please try again later." : error.code === "email_not_confirmed" ? "Please confirm your email before signing in." : "Incorrect email or password.";
      return json({ error: message }, error.status === 429 ? 429 : 401);
    }
    return json({ redirect: "/dashboard" });
  } catch {
    return json({ error: "Sign-in is temporarily unavailable. Please try again." }, 503);
  }
}
