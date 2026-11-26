import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkRequest, json } from "@/lib/auth-http";
import { getSmtpConfig, sendPasswordResetOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email || !email.includes("@")) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      { error: "Password reset OTP requires SUPABASE_SERVICE_ROLE_KEY in .env.local." },
      503
    );
  }

  if (!getSmtpConfig()) {
    return json(
      { error: "Personal email SMTP is not configured (missing SMTP_USER or SMTP_PASS in .env.local)." },
      503
    );
  }

  try {
    const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (error) {
      if (error.status === 404 || error.code === "user_not_found" || /not found/i.test(error.message)) {
        return json({ message: "If an account exists for that email, a verification code has been sent." });
      }
      console.error("Supabase Generate Recovery OTP Error:", error);
      return json({ error: error.message || "Unable to generate verification code." }, error.status || 400);
    }

    const otp = data?.properties?.email_otp;
    if (!otp) {
      console.error("Supabase Generate Recovery OTP Error: missing email_otp in response");
      return json({ error: "Unable to generate verification code." }, 500);
    }

    await sendPasswordResetOtpEmail({ to: email, otp });
    return json({ message: "Verification code sent to your email." });
  } catch (cause) {
    console.error("Reset password email error:", cause);
    return json({ error: "Unable to send verification code email. Check your SMTP settings and try again." }, 503);
  }
}
