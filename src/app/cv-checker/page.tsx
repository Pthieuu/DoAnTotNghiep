import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import DashboardShell from "@/components/dashboard-shell";
import CvCheckerClient from "./client-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Check Japanese CV | Aizuchi.AI",
  description: "Analyze and improve your Japanese CV for job applications to Japanese enterprises.",
};

export default async function CvCheckerPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell user={user} activePage="Check CV">
      <CvCheckerClient />
    </DashboardShell>
  );
}
