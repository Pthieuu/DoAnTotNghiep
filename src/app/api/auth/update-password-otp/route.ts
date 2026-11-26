import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";

export async function POST(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !otp || !password) {
    return json({ error: "Missing required fields." }, 400);
  }
  if (password.length < 12 || password.length > 128) {
    return json({ error: "Password must be between 12 and 128 characters." }, 400);
  }

  try {
    const supabase = await createClient();

    // First verify the recovery OTP
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "recovery",
    });

    if (verifyError) {
      return json({ error: verifyError.message }, verifyError.status || 400);
    }

    // Then update the password (session is established when verifyOtp succeeds)
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      return json({ error: updateError.message }, updateError.status || 400);
    }

    return json({ message: "Password updated successfully." });
  } catch {
    return json({ error: "Service temporarily unavailable. Please try again." }, 503);
  }
}
