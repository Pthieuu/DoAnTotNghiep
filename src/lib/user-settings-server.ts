import "server-only";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { defaultUserSettings, isUserSettingsUpdate, type UserSettings } from "./user-settings";

const columns = "default_jlpt,interview_lang,eval_framework,ai_voice";

export class UserSettingsError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

async function authenticatedClient() {
  if (!supabaseConfig()) throw new UserSettingsError("Supabase chưa được cấu hình.", 503);
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new UserSettingsError("Vui lòng đăng nhập để truy cập cài đặt.", 401);
  return { supabase, user };
}

function databaseError(code?: string): never {
  if (code === "42P01" || code === "PGRST205") {
    throw new UserSettingsError("Chưa có bảng user_settings. Hãy chạy migration 202611170001_create_user_settings.sql.", 503);
  }
  throw new UserSettingsError("Không thể truy cập cài đặt. Vui lòng thử lại.", 500);
}

export async function getUserSettings(): Promise<UserSettings> {
  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase.from("user_settings")
    .select(columns).eq("user_id", user.id).maybeSingle();
  if (error) databaseError(error.code);
  return data ?? { ...defaultUserSettings };
}

export async function updateUserSettings(input: unknown): Promise<UserSettings> {
  const { supabase, user } = await authenticatedClient();
  if (!isUserSettingsUpdate(input)) {
    throw new UserSettingsError("Cài đặt không hợp lệ. Chỉ gửi các trường cài đặt được hỗ trợ và không để trống.", 400);
  }
  // Only supplied fields are updated on conflict; SQL defaults fill a new row.
  const { data, error } = await supabase.from("user_settings")
    .upsert({ ...input, user_id: user.id }, { onConflict: "user_id", defaultToNull: false })
    .select(columns).single();
  if (error) databaseError(error.code);
  return data;
}
