import { checkRequest, json } from "@/lib/auth-http";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  const rejected = checkRequest(request);
  if (rejected) return rejected;
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Request must use application/json." }, 415);
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request payload." }, 400);
  const input = body as Record<string, unknown>;
  const confirmationValue = String(input.confirmation || "").trim().toUpperCase();
  const validConfirmations = ["XÓA", "DELETE"];
  if (Object.keys(input).some((key) => key !== "target" && key !== "confirmation") ||
    !["history", "cvs"].includes(String(input.target)) || !validConfirmations.includes(confirmationValue)) {
    return json({ error: "Please enter DELETE to confirm this operation." }, 400);
  }
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Please log in again." }, 401);
    if (input.target === "history") {
      const { error } = await supabase.rpc("delete_own_interview_history");
      if (error) return json({ error: "Unable to delete history. Check database migrations and try again." }, 500);
    } else {
      // Delete storage first; retain metadata on failure so a retry can find files.
      // Batch queries avoid Supabase's default row limit silently skipping CVs.
      for (;;) {
        const { data, error } = await supabase.from("candidate_cvs").select("id,file_path")
          .eq("user_id", user.id).order("id").limit(100);
        if (error || !data) return json({ error: "Unable to load CV list for deletion. Please try again." }, 500);
        if (!data.length) break;
        const paths = data.flatMap((row) => row.file_path ? [String(row.file_path)] : []);
        if (paths.some((path) => !path.startsWith(`${user.id}/`))) return json({ error: "Invalid CV file path. Cannot proceed." }, 500);
        if (paths.length) {
          const { error: storageError } = await supabase.storage.from("candidate-cvs").remove(paths);
          if (storageError) return json({ error: "Could not remove all CV files from storage. Please try again." }, 500);
        }
        const { error: deleteError } = await supabase.from("candidate_cvs").delete()
          .eq("user_id", user.id).in("id", data.map((row) => row.id));
        if (deleteError) return json({ error: "Files removed but could not delete all CV database records. Please try again." }, 500);
      }
    }
    return json({ deleted: true });
  } catch { return json({ error: "Data deletion service is temporarily unavailable. Please try again." }, 503); }
}
