import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";

export async function POST(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return json({ error: "Unable to sign out. Please try again." }, 503);
    return json({ redirect: "/login" });
  } catch {
    return json({ error: "Unable to sign out. Please try again." }, 503);
  }
}
