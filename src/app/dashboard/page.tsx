import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard-shell";
import Link from "next/link";
import Icon from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { DashboardHero, DashboardAnalytics, DashboardContext } from "@/components/dashboard-overview";
import { loadDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard | Aizuchi.AI", description: "Your interview practice and progress." };

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const data = await loadDashboardData(supabase, user.id);

  return (
    <DashboardShell user={user}>
      <div className="flex w-full flex-col space-y-space-lg">
        <DashboardHero user={user} data={data} />
        {data.errors.length > 0 && (
          <div role="alert" className="rounded-xl bg-error-container p-4 text-sm text-on-error-container">
            <ul className="list-inside list-disc space-y-1">
              {data.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        <DashboardAnalytics data={data} />
        <DashboardContext data={data} />
        <section
          aria-labelledby="interview-history-banner-heading"
          className="rounded-xl border border-surface-container bg-surface-container-lowest p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="interview-history-banner-heading" className="text-lg font-bold text-primary">
                Interview History &amp; AI Reports
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Review your full mock interview history, rubric evaluations, and AI feedback.
              </p>
            </div>
            <Link
              href="/interview-history"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondary"
            >
              View Full History
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
