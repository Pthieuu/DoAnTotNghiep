import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (supabaseConfig() && token && type === "email") {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: "email" });
      if (!error) return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch { /* Show a recoverable error on the login screen. */ }
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
}
