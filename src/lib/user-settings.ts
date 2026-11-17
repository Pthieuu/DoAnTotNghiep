export const settingsOptions = {
  default_jlpt: ["N5", "N4", "N3", "N2", "N1"],
  interview_lang: ["ja", "vi"],
  eval_framework: ["PREP", "STAR"],
  ai_voice: ["Kore", "Aoede", "Puck", "Charon", "Fenrir"],
} as const;

export type UserSettings = {
  [Key in keyof typeof settingsOptions]: (typeof settingsOptions)[Key][number];
};
export type UserSettingsUpdate = Partial<UserSettings>;

export const defaultUserSettings: Readonly<UserSettings> = {
  default_jlpt: "N3",
  interview_lang: "ja",
  eval_framework: "STAR",
  ai_voice: "Kore",
};

export function isUserSettingsUpdate(value: unknown): value is UserSettingsUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length > 0 && entries.every(([key, field]) =>
    Object.hasOwn(settingsOptions, key) && typeof field === "string" &&
    (settingsOptions[key as keyof UserSettings] as readonly string[]).includes(field)
  );
}
