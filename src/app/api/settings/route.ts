import { checkRequest, json } from "@/lib/auth-http";
import { getUserSettings, updateUserSettings, UserSettingsError } from "@/lib/user-settings-server";

function failure(error: unknown) {
  return error instanceof UserSettingsError
    ? json({ error: error.message }, error.status)
    : json({ error: "Dịch vụ cài đặt tạm thời không khả dụng. Vui lòng thử lại." }, 503);
}

export async function GET() {
  try {
    return json({ settings: await getUserSettings() });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  const rejected = checkRequest(request);
  if (rejected) return rejected;
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Yêu cầu phải dùng application/json." }, 415);
  }
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ error: "JSON không hợp lệ." }, 400);
  }
  try {
    return json({ settings: await updateUserSettings(input) });
  } catch (error) {
    return failure(error);
  }
}
