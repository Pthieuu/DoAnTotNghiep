import "server-only";
import { createClient } from "./supabase/server";
import { supabaseConfig } from "./supabase/config";

export async function getUser() {
  if (!supabaseConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const name = data.user.user_metadata.full_name;
  return {
    id: data.user.id,
    email: data.user.email || "",
    name: typeof name === "string" && name.trim() ? name.trim() : data.user.email?.split("@")[0] || "Member",
  };
}
