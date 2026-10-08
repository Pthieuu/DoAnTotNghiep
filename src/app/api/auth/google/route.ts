import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const next = url.searchParams.get('next') || '/dashboard';
  const origin = request.headers.get('origin') || url.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }
  if (data.url) {
    return NextResponse.redirect(data.url);
  }
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
