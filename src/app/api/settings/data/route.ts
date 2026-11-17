import { checkRequest, json } from "@/lib/auth-http";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: Request) {
  const rejected = checkRequest(request);
  if (rejected) return rejected;
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Yêu cầu phải dùng application/json." }, 415);
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Yêu cầu không hợp lệ." }, 400);
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "target" && key !== "confirmation") ||
    !["history", "cvs"].includes(String(input.target)) || input.confirmation !== "XÓA") {
    return json({ error: "Hãy nhập XÓA để xác nhận thao tác." }, 400);
  }
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Vui lòng đăng nhập lại." }, 401);
    if (input.target === "history") {
      const { error } = await supabase.rpc("delete_own_interview_history");
      if (error) return json({ error: "Không thể xóa lịch sử. Kiểm tra migration 202611170004 rồi thử lại." }, 500);
    } else {
      // Delete storage first; retain metadata on failure so a retry can find files.
      // Batch queries avoid Supabase's default row limit silently skipping CVs.
      for (;;) {
        const { data, error } = await supabase.from("candidate_cvs").select("id,file_path")
          .eq("user_id", user.id).order("id").limit(100);
        if (error || !data) return json({ error: "Không thể tải danh sách CV để xóa. Hãy thử lại." }, 500);
        if (!data.length) break;
        const paths = data.flatMap((row) => row.file_path ? [String(row.file_path)] : []);
        if (paths.some((path) => !path.startsWith(`${user.id}/`))) return json({ error: "Đường dẫn CV không hợp lệ. Không thể tiếp tục xóa." }, 500);
        if (paths.length) {
          const { error: storageError } = await supabase.storage.from("candidate-cvs").remove(paths);
          if (storageError) return json({ error: "Chưa xóa hết tệp CV. Một phần dữ liệu có thể đã được xóa; hãy thử lại." }, 500);
        }
        const { error: deleteError } = await supabase.from("candidate_cvs").delete()
          .eq("user_id", user.id).in("id", data.map((row) => row.id));
        if (deleteError) return json({ error: "Tệp đã được xóa nhưng chưa xóa hết dữ liệu CV. Hãy thử lại để hoàn tất." }, 500);
      }
    }
    return json({ deleted: true });
  } catch { return json({ error: "Dịch vụ xóa dữ liệu tạm thời không khả dụng. Hãy thử lại." }, 503); }
}
