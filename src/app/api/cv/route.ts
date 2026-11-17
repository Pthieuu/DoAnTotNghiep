import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";
import { emptyCv, validateCv } from "@/lib/cv-schema";
import { getAiConfig } from "@/lib/ai-config";

function aiConfigured() {
  return Boolean(getAiConfig().geminiApiKey);
}

function storageErrorMessage(error: { message?: string; statusCode?: string; name?: string }) {
  const message = `${error.message || ""} ${error.name || ""}`.toLowerCase();
  if (message.includes("bucket not found") || message.includes("object not found")) return "candidate-cvs bucket not found. Please run CV migration in Supabase.";
  if (message.includes("row-level security") || message.includes("policy") || error.statusCode === "403") return "Supabase Storage denied write access. Please check CV policies and user session.";
  if (message.includes("mime") || message.includes("content type")) return "Supabase Storage rejected file type. Check allowed_mime_types of bucket candidate-cvs.";
  if (message.includes("maximum size") || message.includes("too large") || error.statusCode === "413") return "File exceeds bucket limit of 15 MB.";
  return "Could not save file to Supabase Storage. Check candidate-cvs bucket configuration.";
}

function databaseErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "42P01" || error.code === "PGRST205") return "candidate_cvs table not installed in Supabase.";
  if (error.code === "42703" || error.code === "PGRST204") return "Missing CV columns in Supabase. Please run migration 202609300002_extend_candidate_cvs.sql.";
  if (error.code === "42501") return "Supabase denied write access to candidate_cvs. Check RLS policies and login session.";
  if (error.code === "23505") return "This CV file already exists. Please select another file or rename it.";
  return "Could not save CV information to database. Please check migrations and RLS policies.";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in to view CV." }, 401);
    const { data, error } = await supabase.from("candidate_cvs").select("id,file_name,file_size,status,error_message,source,extracted_data,edited_data,confirmed_data,extraction_notes,created_at,updated_at,file_path").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return json({ error: error.code === "42P01" || error.code === "PGRST205" ? "CV migration not applied in Supabase." : error.code === "42703" || error.code === "PGRST204" ? "Missing new CV columns. Please run migration 202609300002_extend_candidate_cvs.sql." : "Could not load CV." }, 500);
    if (!data) return json({ cv: null, aiConfigured: aiConfigured() });
    let downloadUrl: string | null = null;
    if (data.file_path) {
      const { data: file } = await supabase.storage.from("candidate-cvs").createSignedUrl(data.file_path, 300);
      downloadUrl = file?.signedUrl || null;
    }
    const { file_path, ...cv } = data;
    void file_path;
    return json({ cv: { ...cv, downloadUrl }, aiConfigured: aiConfigured() });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    console.error("CV list request failed", { reason });
    return json({ error: "CV service temporarily unavailable. Check Supabase configuration and server logs." }, 503);
  }
}

export async function POST(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in to upload CV." }, 401);
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json().catch(() => null) as { manual?: unknown } | null;
      if (body?.manual !== true) return json({ error: "Invalid CV creation request." }, 400);
      const id = crypto.randomUUID();
      const { data: row, error } = await supabase.from("candidate_cvs").insert({ id, user_id: user.id, file_path: null, file_name: "Manual CV", file_size: null, source: "manual", status: "parsed", extracted_data: emptyCv }).select("id,file_name,file_size,status,source,extracted_data,edited_data,confirmed_data,extraction_notes,created_at").single();
      if (error) return json({ error: databaseErrorMessage(error) }, 500);
      return json({ cv: row }, 201);
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "Please select a PDF or DOCX file." }, 400);
    if (!file.size || file.size > 15 * 1024 * 1024) return json({ error: "File size must be between 1 byte and 15 MB." }, 400);
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "pdf" && ext !== "docx") return json({ error: "Only PDF or DOCX files are supported." }, 400);
    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const validPdf = ext === "pdf" && new TextDecoder().decode(header.slice(0, 5)) === "%PDF-";
    const validDocx = ext === "docx" && header[0] === 0x50 && header[1] === 0x4b;
    if (!validPdf && !validDocx) return json({ error: "File content does not match PDF or DOCX format. Please re-export your CV and try again." }, 400);
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
    return json({ error: "CV upload failed before saving. Check network connection, file size, and Supabase config." }, 503);
  }
}

export async function PUT(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in." }, 401);
    const body = await request.json().catch(() => null) as { id?: unknown; data?: unknown; confirmed?: unknown } | null;
    if (!body || typeof body.id !== "string" || typeof body.confirmed !== "boolean" || !validateCv(body.data)) return json({ error: "Invalid CV data." }, 400);
    const changes = body.confirmed
      ? { confirmed_data: body.data, edited_data: null, status: "confirmed", error_message: null, updated_at: new Date().toISOString() }
      : { edited_data: body.data, status: "parsed", error_message: null, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("candidate_cvs").update(changes).eq("id", body.id).eq("user_id", user.id).in("status", ["parsed", "confirmed", "error"]).select("id,status,edited_data,confirmed_data,extracted_data").maybeSingle();
    if (error) return json({ error: body.confirmed ? "Could not confirm CV. Please check database settings." : "Could not save CV draft." }, 500);
    if (!data) return json({ error: "CV has not been extracted or no longer exists." }, 404);
    return json({ cv: data });
  } catch { return json({ error: "Could not save CV." }, 503); }
}

export async function DELETE(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in." }, 401);
    const body = await request.json().catch(() => null) as { id?: unknown } | null;
    if (!body || typeof body.id !== "string") return json({ error: "Invalid CV." }, 400);
    const { data, error } = await supabase.from("candidate_cvs").delete().eq("id", body.id).eq("user_id", user.id).select("file_path").maybeSingle();
    if (error) return json({ error: "Could not delete CV." }, 500);
    if (!data) return json({ error: "CV no longer exists." }, 404);
    if (data.file_path) await supabase.storage.from("candidate-cvs").remove([data.file_path]);
    return json({ deleted: true });
  } catch { return json({ error: "Could not delete CV." }, 503); }
}
