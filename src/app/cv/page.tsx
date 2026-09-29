import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import DashboardShell from "@/components/dashboard-shell";
import CvWorkspace from "@/components/cv-workspace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My CV | Aizuchi.AI", description: "Upload your CV and prepare it for Japanese interview practice." };

export default async function CvPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  return <DashboardShell user={user} activePage="My CV"><CvWorkspace /></DashboardShell>;
}
