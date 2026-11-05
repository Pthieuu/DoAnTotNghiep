import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import DashboardShell from "@/components/dashboard-shell";
import CvCheckerClient from "./client-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Check CV Chuẩn Nhật (NiX) | Aizuchi.AI",
  description: "Thẩm định CV tiếng Nhật tự động theo chuẩn NiX Education và doanh nghiệp IT Nhật Bản.",
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

