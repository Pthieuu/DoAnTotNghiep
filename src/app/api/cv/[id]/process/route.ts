import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";
import { analysisNotes } from "@/lib/cv-schema";
import { processCv } from "@/lib/cv-processing";

export const maxDuration = 180;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const failure = checkRequest(request);
  if (failure) return failure;
  const { id } = await context.params;
  let originalStatus: string | null = null;
  try {
    const requestBody = await request.json().catch(() => null) as { force?: unknown } | null;
    const force = requestBody?.force === true;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Vui lòng đăng nhập." }, 401);
    const { data: row, error } = await supabase.from("candidate_cvs").select("id,file_path,file_name,file_size,status").eq("id", id).eq("user_id", user.id).single();
    if (error || !row) return json({ error: "Không tìm thấy CV." }, 404);
    originalStatus = row.status;
    if ((row.status === "confirmed" || row.status === "parsed") && !force) return json({ error: "CV này đã được trích xuất." }, 409);
    const { data: blob, error: downloadError } = await supabase.storage.from("candidate-cvs").download(row.file_path);
    if (downloadError || !blob) return json({ error: "Không thể đọc tệp đã tải lên." }, 500);
    const file = new File([blob], row.file_name, { type: row.file_name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const result = await processCv(file);
    const notes = [...result.notes, ...analysisNotes(result.data)];
    const { data: updated, error: updateError } = await supabase.from("candidate_cvs").update({ status: "parsed", extracted_data: result.data, edited_data: null, confirmed_data: null, extraction_notes: notes, error_message: null, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).select("id,status,extracted_data,edited_data,confirmed_data,extraction_notes").single();
    if (updateError) return json({ error: "Không thể lưu kết quả trích xuất." }, 500);
    const { data: previous } = await supabase.from("candidate_cvs").select("id,file_path").eq("user_id", user.id).neq("id", id).neq("status", "error");
    if (previous?.length) {
      const paths = previous.map((item) => item.file_path);
      await supabase.from("candidate_cvs").delete().eq("user_id", user.id).neq("id", id);
      await supabase.storage.from("candidate-cvs").remove(paths);
    }
    return json({ cv: updated });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Không đọc được CV.";
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await supabase.from("candidate_cvs").update({ status: originalStatus === "parsed" || originalStatus === "confirmed" ? originalStatus : "error", error_message: reason.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
    } catch { /* Return the actionable error below. */ }
    return json({ error: reason }, 422);
  }
}
