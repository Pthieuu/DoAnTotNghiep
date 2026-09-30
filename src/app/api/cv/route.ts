import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";

function aiConfigured() {
  const provider = (process.env.CV_AI_PROVIDER || "ollama").toLowerCase();
  return provider === "ollama" || (provider === "openai" && Boolean(process.env.OPENAI_API_KEY));
}

function storageErrorMessage(error: { message?: string; statusCode?: string; name?: string }) {
  const message = `${error.message || ""} ${error.name || ""}`.toLowerCase();
  if (message.includes("bucket not found") || message.includes("object not found")) return "Chưa có bucket candidate-cvs. Hãy chạy migration CV trong Supabase.";
  if (message.includes("row-level security") || message.includes("policy") || error.statusCode === "403") return "Supabase Storage từ chối quyền ghi. Hãy chạy policy trong migration CV và kiểm tra đăng nhập.";
  if (message.includes("mime") || message.includes("content type")) return "Supabase Storage từ chối kiểu tệp. Kiểm tra allowed_mime_types của bucket candidate-cvs.";
  if (message.includes("maximum size") || message.includes("too large") || error.statusCode === "413") return "Tệp vượt giới hạn 15 MB của bucket.";
  return "Không thể lưu tệp vào Supabase Storage. Hãy kiểm tra cấu hình bucket candidate-cvs.";
}

function databaseErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "42P01" || error.code === "PGRST205") return "Chưa cài migration candidate_cvs trong Supabase.";
  if (error.code === "42501") return "Supabase từ chối quyền ghi candidate_cvs. Hãy kiểm tra RLS policy và phiên đăng nhập.";
  if (error.code === "23505") return "Tệp CV này đã tồn tại. Hãy chọn lại hoặc đổi tên tệp.";
  return "Không thể lưu thông tin CV vào cơ sở dữ liệu. Hãy kiểm tra migration và RLS policy.";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Vui lòng đăng nhập để xem CV." }, 401);
    const { data, error } = await supabase.from("candidate_cvs").select("id,file_name,file_size,status,error_message,extracted_data,confirmed_data,extraction_notes,created_at,updated_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return json({ error: error.code === "42P01" || error.code === "PGRST205" ? "Chưa cài migration CV trong Supabase." : "Không thể tải CV." }, 500);
    if (!data) return json({ cv: null, aiConfigured: aiConfigured() });
    let downloadUrl: string | null = null;
    const { data: file } = await supabase.storage.from("candidate-cvs").createSignedUrl(`${user.id}/${data.id}`, 300);
    downloadUrl = file?.signedUrl || null;
    return json({ cv: { ...data, downloadUrl }, aiConfigured: aiConfigured() });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.error("CV list request failed", { reason });
    return json({ error: "Dịch vụ CV tạm thời không khả dụng. Kiểm tra cấu hình Supabase và log máy chủ." }, 503);
  }
}

export async function POST(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Vui lòng đăng nhập để tải CV lên." }, 401);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Hãy chọn tệp PDF hoặc DOCX." }, 400);
    if (!file.size || file.size > 15 * 1024 * 1024) return json({ error: "Dung lượng tệp phải từ 1 byte đến 15 MB." }, 400);
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "pdf" && ext !== "docx") return json({ error: "Chỉ hỗ trợ tệp PDF hoặc DOCX." }, 400);
    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const validPdf = ext === "pdf" && new TextDecoder().decode(header.slice(0, 5)) === "%PDF-";
    const validDocx = ext === "docx" && header[0] === 0x50 && header[1] === 0x4b;
    if (!validPdf && !validDocx) return json({ error: "Nội dung tệp không khớp phần mở rộng PDF hoặc DOCX. Hãy xuất lại CV rồi thử tiếp." }, 400);
    const { data: previous } = await supabase.from("candidate_cvs").select("id,file_path").eq("user_id", user.id).neq("status", "error").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const id = crypto.randomUUID();
    const path = `${user.id}/${id}`;
    const contentType = ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const { error: uploadError } = await supabase.storage.from("candidate-cvs").upload(path, file, { contentType, upsert: false });
    if (uploadError) {
      console.error("CV storage upload failed", { code: uploadError.statusCode, name: uploadError.name, message: uploadError.message });
      return json({ error: storageErrorMessage(uploadError) }, 500);
    }
    const { data: row, error: insertError } = await supabase.from("candidate_cvs").insert({ id, user_id: user.id, file_path: path, file_name: file.name.slice(0, 255), file_size: file.size, status: "processing" }).select("id,file_name,file_size,status,created_at").single();
    if (insertError) { await supabase.storage.from("candidate-cvs").remove([path]); console.error("CV metadata insert failed", { code: insertError.code, message: insertError.message }); return json({ error: databaseErrorMessage(insertError) }, 500); }
    return json({ cv: row, previousId: previous?.id || null }, 201);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.error("CV upload request failed", { reason });
    return json({ error: "Upload CV thất bại trước khi lưu. Kiểm tra kết nối, kích thước request và cấu hình Supabase." }, 503);
  }
}

export async function PUT(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Vui lòng đăng nhập." }, 401);
    const body = await request.json().catch(() => null) as { id?: unknown; data?: unknown } | null;
    if (!body || typeof body.id !== "string" || !body.data || typeof body.data !== "object") return json({ error: "Dữ liệu CV không hợp lệ." }, 400);
    const { data, error } = await supabase.from("candidate_cvs").update({ confirmed_data: body.data, status: "confirmed", error_message: null, updated_at: new Date().toISOString() }).eq("id", body.id).eq("user_id", user.id).in("status", ["parsed", "confirmed", "error"]).select("id,status,confirmed_data").maybeSingle();
    if (error) return json({ error: "Không thể xác nhận CV. Hãy kiểm tra cài đặt cơ sở dữ liệu." }, 500);
    if (!data) return json({ error: "CV chưa được trích xuất hoặc không còn tồn tại." }, 404);
    return json({ cv: data });
  } catch { return json({ error: "Không thể lưu CV." }, 503); }
}

export async function DELETE(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Vui lòng đăng nhập." }, 401);
    const body = await request.json().catch(() => null) as { id?: unknown } | null;
    if (!body || typeof body.id !== "string") return json({ error: "CV không hợp lệ." }, 400);
    const { data, error } = await supabase.from("candidate_cvs").delete().eq("id", body.id).eq("user_id", user.id).select("file_path").maybeSingle();
    if (error) return json({ error: "Không thể xóa CV." }, 500);
    if (!data) return json({ error: "CV không còn tồn tại." }, 404);
    await supabase.storage.from("candidate-cvs").remove([data.file_path]);
    return json({ deleted: true });
  } catch { return json({ error: "Không thể xóa CV." }, 503); }
}
