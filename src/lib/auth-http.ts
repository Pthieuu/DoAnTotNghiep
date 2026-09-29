import { NextResponse } from "next/server";
import { supabaseConfig } from "./supabase/config";

export function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function checkRequest(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return json({ error: "Request origin is not allowed." }, 403);
  }
  if (!supabaseConfig()) return json({ error: "Authentication is not configured yet. Follow docs/supabase-setup.md to connect Supabase." }, 503);
  return null;
}

export async function credentials(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  if (typeof input.email !== "string" || typeof input.password !== "string") return null;
  const email = input.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !input.password || input.password.length > 128) return null;
  return { email, password: input.password, name: typeof input.name === "string" ? input.name.trim() : "" };
}
