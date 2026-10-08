import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";

export async function POST(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  const body = await request.json().catch(() => null);
  if (!body || !body.password || typeof body.password !== "string") {
    return json({ error: "Enter a valid new password." }, 400);
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: body.password
    });
    
    if (error) {
      return json({ error: error.message }, error.status || 400);
    }
    
    return json({ message: "Password updated successfully." });
  } catch {
    return json({ error: "Service temporarily unavailable. Please try again." }, 503);
  }
}
