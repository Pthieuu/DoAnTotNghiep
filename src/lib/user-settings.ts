export const settingsOptions = {
  default_jlpt: ["N5", "N4", "N3", "N2", "N1"],
  interview_lang: ["ja", "vi"],
  eval_framework: ["PREP", "STAR"],
  question_count: [4, 6, 8, 10],
  speech_rate: [0.5, 0.75, 1, 1.25, 1.5],
  live_transcript: [true, false],
  vocabulary_hints: [true, false],
  email_reminders: [true, false],
  reminder_frequency: ["daily", "weekly"],
  ai_voice: ["Kore", "Aoede", "Puck", "Charon", "Fenrir"],
} as const;

export type UserSettings = {
  [Key in keyof typeof settingsOptions]: (typeof settingsOptions)[Key][number];
} & { speech_voice_uri: string };
export type UserSettingsUpdate = Partial<UserSettings>;

export const defaultUserSettings: Readonly<UserSettings> = {
  default_jlpt: "N3",
  interview_lang: "ja",
  eval_framework: "STAR",
  ai_voice: "Kore",
  question_count: 6,
  email_reminders: false,
  reminder_frequency: "weekly",
  speech_rate: 1,
  speech_voice_uri: "",
  live_transcript: true,
  vocabulary_hints: true,
};

export function isUserSettingsUpdate(value: unknown): value is UserSettingsUpdate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length > 0 && entries.every(([key, field]) =>
    key === "speech_voice_uri" ? typeof field === "string" && field.length <= 512 :
    Object.hasOwn(settingsOptions, key) &&
    (settingsOptions[key as keyof typeof settingsOptions] as readonly unknown[]).includes(field)
  );
}
