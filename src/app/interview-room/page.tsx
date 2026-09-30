import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { Metadata } from "next";
import DashboardShell from "@/components/dashboard-shell";
import InterviewRoomClient from "./client-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Interview Room | Aizuchi.AI",
  description: "AI Japanese Interview Practice.",
};

export default async function InterviewRoomPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell user={user} activePage="Interview Room">
      <InterviewRoomClient />
    </DashboardShell>
  );
}
