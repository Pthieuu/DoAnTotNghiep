import { redirect } from "next/navigation";
import LoginForm from "@/components/login-form";
import { getUser } from "@/lib/auth";
import { supabaseConfig } from "@/lib/supabase/config";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getUser()) redirect("/dashboard");
  const params = await searchParams;
  return <LoginForm configured={Boolean(supabaseConfig())} confirmationError={params.error === "confirmation"} />;
}
