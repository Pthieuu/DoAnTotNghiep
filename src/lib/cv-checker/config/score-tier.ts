export interface ScoreTierConfig {
  minScore: number;
  label: string;
  ringColor: string;
  trackColor: string;
  scoreTextClass: string;
  badgeClass: string;
}

export const SCORE_TIERS: ScoreTierConfig[] = [
  {
    minScore: 85,
    label: "Rất tốt",
    ringColor: "#10b981", // emerald-500
    trackColor: "#e2e8f0", // slate-200
    scoreTextClass: "text-emerald-700",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    minScore: 70,
    label: "Khá tốt",
    ringColor: "#2563eb", // blue-600
    trackColor: "#e2e8f0",
    scoreTextClass: "text-blue-700",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    minScore: 50,
    label: "Cần chỉnh sửa thêm",
    ringColor: "#d97706", // amber-600
    trackColor: "#e2e8f0",
    scoreTextClass: "text-amber-800",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-200",
  },
  {
    minScore: 0,
    label: "Cần làm lại nhiều phần",
    ringColor: "#e11d48", // rose-600
    trackColor: "#e2e8f0",
    scoreTextClass: "text-rose-700",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
  },
];

export function getScoreTier(score: number): ScoreTierConfig {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  for (const tier of SCORE_TIERS) {
    if (safeScore >= tier.minScore) {
      return tier;
    }
  }
  return SCORE_TIERS[SCORE_TIERS.length - 1];
}

