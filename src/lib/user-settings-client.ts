import type { UserSettings, UserSettingsUpdate } from "./user-settings";

async function requestSettings(init?: RequestInit): Promise<UserSettings> {
  const response = await fetch("/api/settings", { ...init, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Không thể truy cập cài đặt.");
  return body.settings;
}

export function getUserSettings(): Promise<UserSettings> {
  return requestSettings();
}

export function updateUserSettings(settings: UserSettingsUpdate): Promise<UserSettings> {
  return requestSettings({
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}
