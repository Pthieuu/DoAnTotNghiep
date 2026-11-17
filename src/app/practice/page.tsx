import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard-shell";
import DashboardPractice from "@/components/dashboard-practice";
import { loadDashboardPractice } from "@/lib/dashboard-practice";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Practice Weaknesses | Aizuchi.AI",
  description: "Targeted practice on weakness criteria from your latest completed interview.",
};

export default async function PracticePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const practiceData = await loadDashboardPractice(supabase, user.id);

  return (
    <DashboardShell user={user} activePage="Practice Weaknesses">
      <div className="flex w-full flex-col space-y-space-lg">
        <header className="rounded-xl border border-surface-container bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Interview Lab</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary">Practice Weaknesses</h1>
              <p className="mt-1 text-sm text-on-surface-variant">
                Targeted drills focused on improvement areas from your latest completed interview.
              </p>
            </div>
          </div>
        </header>

        <DashboardPractice key={practiceData.session?.id || "no-practice"} data={practiceData} />
      </div>
    </DashboardShell>
  );
}

