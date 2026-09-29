import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authCookieOptions, supabaseConfig } from "./config";

export async function createClient() {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase is not configured.");
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; proxy refreshes them before render.
        }
      },
    },
  });
}
