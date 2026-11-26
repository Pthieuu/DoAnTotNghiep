import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import { getUser } from "@/lib/auth";
import DashboardShell from "@/components/dashboard-shell";
import SettingsTabs from "@/components/settings/settings-tabs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Settings | Aizuchi.AI",
  description: "Customize your AI Japanese interview practice experience.",
};

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <DashboardShell user={user} activePage="Settings">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-start gap-4">
          <div className="rounded-xl bg-primary/5 p-3 text-primary">
            <Settings2 size={24} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Settings</h1>
            <p className="mt-2 text-sm text-slate-500">Personalize your AI Japanese interview preparation journey.</p>
          </div>
        </header>
        <SettingsTabs user={user} />
      </div>
    </DashboardShell>
  );
}
