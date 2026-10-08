import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";

export async function POST(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.otp || !body.password || typeof body.password !== "string") {
    return json({ error: "Missing required fields." }, 400);
  }
  try {
    const supabase = await createClient();
    
    // First verify the OTP
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: body.email,
      token: body.otp,
      type: "recovery"
    });
    
    if (verifyError) {
      return json({ error: verifyError.message }, verifyError.status || 400);
    }
    
    // Then update the password (session is established if verifyOtp is successful)
    const { error: updateError } = await supabase.auth.updateUser({
      password: body.password
    });
    
    if (updateError) {
      return json({ error: updateError.message }, updateError.status || 400);
    }
    
    return json({ message: "Password updated successfully." });
  } catch {
    return json({ error: "Service temporarily unavailable. Please try again." }, 503);
  }
}
