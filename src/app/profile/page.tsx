import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import ProfileEditor from "@/components/profile-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Profile | Aizuchi.AI", description: "Your candidate profile and interview preferences." };

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login");
  return <ProfileEditor user={user} />;
}
