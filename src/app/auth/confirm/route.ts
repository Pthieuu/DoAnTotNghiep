import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as "email" | "recovery" | "invite" | "magiclink" | null;
  const next = request.nextUrl.searchParams.get("next") || "/dashboard";
  const code = request.nextUrl.searchParams.get("code");
  
  if (supabaseConfig()) {
    if (code) {
      try {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          return NextResponse.redirect(new URL(next, request.url));
        }
      } catch { /* Ignore and fall through to error */ }
    } else if (token && (type === "email" || type === "recovery" || type === "invite" || type === "magiclink")) {
      try {
        const supabase = await createClient();
        const { error } = await supabase.auth.verifyOtp({ token_hash: token, type });
        if (!error) {
          if (type === "recovery") {
            return NextResponse.redirect(new URL("/update-password", request.url));
          }
          return NextResponse.redirect(new URL(next, request.url));
        }
      } catch { /* Show a recoverable error on the login screen. */ }
    }
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
}
