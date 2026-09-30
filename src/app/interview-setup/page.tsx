import { redirect } from "next/navigation";
import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard-shell";
import InterviewSetupForm from "@/components/interview-setup-form";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Set Up Interview | Aizuchi.AI",
  description: "Configure a Japanese interview practice session.",
};

export default async function InterviewSetupPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: cv } = await supabase
    .from("candidate_cvs")
    .select("id,file_name,confirmed_data")
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <DashboardShell user={user} activePage="Interview Setup">
      <InterviewSetupForm cv={cv ? { fileName: cv.file_name, data: cv.confirmed_data } : null} />
    </DashboardShell>
  );
}
