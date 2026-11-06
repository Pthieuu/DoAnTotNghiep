import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import DashboardShell from "@/components/dashboard-shell";
import CvCheckerClient from "./client-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Check CV Tiếng Nhật | Aizuchi.AI",
  description: "Phân tích và nhận góp ý hoàn thiện CV tiếng Nhật khi ứng tuyển doanh nghiệp Nhật Bản.",
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
