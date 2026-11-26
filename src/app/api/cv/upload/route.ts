import { createClient } from "@/lib/supabase/server";
import { checkRequest, json } from "@/lib/auth-http";

const bucket = "candidate-cvs";
const maxSize = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  const body = await request.json().catch(() => null) as { fileName?: unknown; fileSize?: unknown } | null;
  if (!body || typeof body.fileName !== "string" || typeof body.fileSize !== "number"
    || body.fileSize < 1 || body.fileSize > maxSize || !/\.(pdf|docx)$/i.test(body.fileName)) {
    return json({ error: "Select a PDF or DOCX file up to 15 MB." }, 400);
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Please sign in." }, 401);
  const id = crypto.randomUUID();
  const path = `${user.id}/${id}`;
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return json({ error: "Could not prepare CV upload." }, 500);
  return json({ id, path, token: data.token });
}

export async function PUT(request: Request) {
  const failure = checkRequest(request);
  if (failure) return failure;
  const body = await request.json().catch(() => null) as { id?: unknown; fileName?: unknown; fileSize?: unknown } | null;
  if (!body || typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)
    || typeof body.fileName !== "string" || !/\.(pdf|docx)$/i.test(body.fileName)
    || typeof body.fileSize !== "number" || body.fileSize < 1 || body.fileSize > maxSize) {
    return json({ error: "Invalid CV upload." }, 400);
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Please sign in." }, 401);
  const path = `${user.id}/${body.id}`;
  const { data: objects, error: listError } = await supabase.storage.from(bucket).list(user.id, { search: body.id });
  if (listError || !objects?.some((object) => object.name === body.id && object.metadata?.size === body.fileSize)) {
    return json({ error: "Uploaded CV was not found or its size changed." }, 409);
  }
  const { data: previous } = await supabase.from("candidate_cvs").select("id").eq("user_id", user.id).neq("status", "error").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: cv, error } = await supabase.from("candidate_cvs").insert({ id: body.id, user_id: user.id, file_path: path, file_name: body.fileName.slice(0, 255), file_size: body.fileSize, status: "processing" }).select("id,file_name,file_size,status,created_at").single();
  if (error) return json({ error: "Could not save CV information." }, 500);
  return json({ cv, previousId: previous?.id || null }, 201);
}
