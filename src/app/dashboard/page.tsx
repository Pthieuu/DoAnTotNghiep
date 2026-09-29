import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import type { Metadata } from "next";
import Icon from "@/components/icon";
import DashboardShell from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard | Aizuchi.AI", description: "Your interview practice and progress." };

type Interview = { id: string; title: string; company: string | null; level: string | null; score: number | null; status: string; completed_at: string | null };
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const { data, error } = await supabase.from("interview_sessions")
    .select("id,title,company,level,score,status,completed_at")
    .eq("user_id", user.id).order("completed_at", { ascending: false, nullsFirst: false });
  const sessions = (data || []) as Interview[];
  const completedSessions = sessions.filter((session) => session.status === "completed");
  const scoredSessions = completedSessions.filter((session) => session.score !== null);
  const averageScore = scoredSessions.length ? Math.round(scoredSessions.reduce((total, session) => total + (session.score || 0), 0) / scoredSessions.length) : 0;
  const scores = [...scoredSessions].sort((a, b) => (a.completed_at || "").localeCompare(b.completed_at || "")).slice(-5);
  return (
    <DashboardShell user={user}>
<div className="flex flex-col w-full space-y-space-lg">
{/* ==========================================
       1. HERO & WELCOME BANNER
       ========================================== */}
<div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary-container to-secondary p-space-lg shadow-md text-on-primary">
{/* Decorative Ambient Glows */}
<div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none"></div>
<div className="absolute right-1/4 -bottom-16 h-48 w-48 rounded-full bg-tertiary-fixed/15 blur-2xl pointer-events-none"></div>
<div className="relative z-10 flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-space-lg">
<div className="space-y-space-xs max-w-3xl">
<div className="flex flex-wrap items-center gap-space-xs">
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-lowest/15 backdrop-blur-md text-on-primary font-label-sm text-label-sm tracking-wide">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed animate-pulse"></span>
            {user.email}
          </span>
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">
            JLPT N2 (Target: N1 / Business)
          </span>
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-fixed-variant/50 text-primary-fixed font-label-sm text-label-sm">
            Backend &amp; Full-Stack Track
          </span>
</div>
<div className="pt-1">
<h1 className="font-headline-lg text-[24px] sm:text-headline-lg font-bold tracking-tight text-on-primary flex flex-wrap items-center gap-2">
            Welcome, {user.name}
            <span className="inline-block  text-[26px]">👋</span>
</h1>
<p lang="ja" className="mt-1 text-sm text-primary-fixed-dim">ようこそ</p>
<p className="font-body-md text-body-md text-primary-fixed-dim/90 pt-0.5 flex flex-wrap items-center gap-1.5">
<span className="inline-flex shrink-0 items-center justify-center text-[18px] text-tertiary-fixed"><Icon name="event_upcoming" /></span>
            No upcoming interview scheduled
</p>
</div>
</div>
{/* Action Cluster */}
<div className="flex flex-wrap items-center gap-space-sm flex-shrink-0 w-full sm:w-auto">
<button type="button" className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-space-lg py-3 rounded-lg bg-surface-container-lowest text-primary font-label-lg text-label-lg font-bold shadow-lg hover:bg-surface-container-low transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" data-mock="interview-room">
<span className="inline-flex shrink-0 items-center justify-center text-[20px] text-secondary"><Icon name="rocket_launch" /></span>
<span>Start New Interview</span>
</button>
<button type="button" className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-space-md py-3 rounded-lg bg-surface-container-lowest/15 hover:bg-surface-container-lowest/25 text-on-primary backdrop-blur-md font-label-lg text-label-lg font-medium transition-all" data-mock="practice-weaknesses">
<span className="inline-flex shrink-0 items-center justify-center text-[18px] text-tertiary-fixed"><Icon name="bolt" /></span>
<span>Quick Practice (5 min)</span>
</button>
</div>
</div>
</div>
{/* ==========================================
       2. TOP ANALYTICS KPI CARDS
       ========================================== */}
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
{/* KPI 1 */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-shadow">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-on-surface-variant font-medium">Completed Interviews</span>
<span className="p-2 rounded-lg bg-secondary-fixed/50 text-secondary">
<span className="inline-flex shrink-0 items-center justify-center text-[20px]"><Icon name="video_chat" /></span>
</span>
</div>
<div className="mt-2 flex items-baseline gap-2">
<span className="font-headline-lg text-headline-lg font-bold text-primary">{completedSessions.length}</span>
<span className="font-label-md text-label-md text-on-surface-variant">sessions</span>
</div>
<div className="mt-3 flex items-center justify-between pt-2 bg-surface-container-low/60 rounded px-2 py-1">
<span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant flex items-center gap-0.5">
<span className="inline-flex shrink-0 items-center justify-center text-[14px]"><Icon name="trending_up" /></span>
          Saved to your account
        </span>
<span className="font-label-sm text-label-sm text-on-surface-variant">Personal history</span>
</div>
</div>
{/* KPI 2 */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-shadow">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-on-surface-variant font-medium">Average Score</span>
<span className="p-2 rounded-lg bg-tertiary-fixed/60 text-on-tertiary-fixed">
<span className="inline-flex shrink-0 items-center justify-center text-[20px]"><Icon name="grade" /></span>
</span>
</div>
<div className="mt-2 flex items-baseline gap-2">
<span className="font-headline-lg text-headline-lg font-bold text-primary">{averageScore}</span>
<span className="font-body-md text-body-md text-on-surface-variant">/ 100</span>
</div>
<div className="mt-3 flex items-center justify-between pt-2 bg-surface-container-low/60 rounded px-2 py-1">
<span className="font-label-sm text-label-sm text-secondary font-medium">Based on {scoredSessions.length} scored sessions</span>
<span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold">—</span>
</div>
</div>
{/* KPI 3 */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-shadow">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-on-surface-variant font-medium">Keigo &amp; Business Japanese · <span lang="ja">敬語</span></span>
<span className="p-2 rounded-lg bg-primary-fixed text-primary">
<span className="inline-flex shrink-0 items-center justify-center text-[20px]"><Icon name="record_voice_over" /></span>
</span>
</div>
<div className="mt-2 flex items-baseline gap-2">
<span className="font-headline-lg text-headline-lg font-bold text-primary">0</span>
<span className="font-body-md text-body-md text-on-surface-variant">/ 100</span>
</div>
<div className="mt-3 flex items-center justify-between pt-2 bg-surface-container-low/60 rounded px-2 py-1">
<span className="font-label-sm text-label-sm text-on-surface-variant truncate">Humble / honorific accuracy</span>
<span className="font-label-sm text-label-sm text-secondary font-semibold">Stable</span>
</div>
</div>
{/* KPI 4 */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-shadow">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-on-surface-variant font-medium">Estimated Pass Rate</span>
<span className="p-2 rounded-lg bg-surface-container-high text-primary">
<span className="inline-flex shrink-0 items-center justify-center text-[20px]"><Icon name="analytics" /></span>
</span>
</div>
<div className="mt-2 flex items-baseline gap-2">
<span className="font-headline-lg text-headline-lg font-bold text-secondary">0%</span>
<span className="font-label-md text-label-md text-on-tertiary-fixed-variant font-semibold">AI estimate</span>
</div>
<div className="mt-3 flex items-center justify-between pt-2 bg-surface-container-low/60 rounded px-2 py-1">
<span className="font-label-sm text-label-sm text-on-surface-variant truncate">Rakuten / LINE Yahoo!</span>
<span className="font-label-sm text-label-sm text-primary font-semibold">Rank A</span>
</div>
</div>
</div>
{/* ==========================================
       3. SCORE PROGRESSION & TELEMETRY SECTION
       ========================================== */}
<div id="analytics" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
{/* Left: Progression Trend Chart (8 Cols) */}
<div className="lg:col-span-7 xl:col-span-8 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div>
<div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
<div>
<h2 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-2">
<span className="inline-flex shrink-0 items-center justify-center text-[22px] text-secondary"><Icon name="ssid_chart" /></span>
              Interview Scores &amp; Progress
            </h2>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              Your overall performance across the last 5 practice sessions.
            </p>
</div>
<div className="flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded-lg">
<span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
<span className="font-label-sm text-label-sm text-on-surface font-medium">Interview score</span>
<span className="mx-1 text-outline-variant">•</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">Pass benchmark: 75</span>
</div>
</div>
{/* SVG Progression Visualization */}
<div className="relative w-full h-56 pt-4 pb-2">
{scores.length === 0 ? <div className="flex h-56 items-center justify-center text-sm text-on-surface-variant">Your score chart will appear after your first completed interview.</div> : <div className="flex h-56 items-center justify-center gap-3">{scores.map((session) => <div key={session.id} className="flex h-full flex-col items-center justify-end gap-2"><span className="text-xs font-semibold">{session.score}</span><div className="w-8 rounded-t bg-secondary" style={{ height: `${session.score}%` }} /><span className="text-[10px] text-on-surface-variant">{session.completed_at ? new Date(session.completed_at).toLocaleDateString() : "—"}</span></div>)}</div>}{false && <svg role="img" aria-hidden="true" className="hidden" preserveAspectRatio="none" viewBox="0 0 600 180">
<defs>
<linearGradient id="areaGradient" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stopColor="#35618e" stopOpacity="0.25"></stop>
<stop offset="100%" stopColor="#35618e" stopOpacity="0.00"></stop>
</linearGradient>
</defs>
{/* Grid Lines */}
<line stroke="#f2f4f6" strokeWidth="1" x1="40" x2="560" y1="20" y2="20"></line>
<line stroke="#f2f4f6" strokeWidth="1" x1="40" x2="560" y1="65" y2="65"></line>
<line stroke="#f2f4f6" strokeWidth="1" x1="40" x2="560" y1="110" y2="110"></line>
<line stroke="#f2f4f6" strokeWidth="1" x1="40" x2="560" y1="155" y2="155"></line>
<line x1="40" x2="560" y1="99" y2="99" stroke="#81848c" strokeDasharray="5 5" />
{/* Area Fill */}
<polygon fill="url(#areaGradient)" points="60,135 180,118 300,102 420,91 540,79 540,165 60,165"></polygon>
{/* Line Graph */}
<polyline fill="none" points="60,135 180,118 300,102 420,91 540,79" stroke="#35618e" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></polyline>
{/* Data Points */}
{/* Point 1: 62 pt */}
<circle cx="60" cy="135" fill="#ffffff" r="5" stroke="#35618e" strokeWidth="2.5"></circle>
<text className="font-label-sm text-[11px] fill-[#45464e] font-semibold" textAnchor="middle" x="60" y="125">62</text>
<text className="font-label-sm text-[10px] fill-[#75777f]" textAnchor="middle" x="60" y="175">9/05</text>
{/* Point 2: 68 pt */}
<circle cx="180" cy="118" fill="#ffffff" r="5" stroke="#35618e" strokeWidth="2.5"></circle>
<text className="font-label-sm text-[11px] fill-[#45464e] font-semibold" textAnchor="middle" x="180" y="108">68</text>
<text className="font-label-sm text-[10px] fill-[#75777f]" textAnchor="middle" x="180" y="175">9/08</text>
{/* Point 3: 74 pt */}
<circle cx="300" cy="102" fill="#ffffff" r="5" stroke="#35618e" strokeWidth="2.5"></circle>
<text className="font-label-sm text-[11px] fill-[#45464e] font-semibold" textAnchor="middle" x="300" y="92">74</text>
<text className="font-label-sm text-[10px] fill-[#75777f]" textAnchor="middle" x="300" y="175">9/15</text>
{/* Point 4: 78 pt */}
<circle cx="420" cy="91" fill="#ffffff" r="5" stroke="#35618e" strokeWidth="2.5"></circle>
<text className="font-label-sm text-[11px] fill-[#45464e] font-semibold" textAnchor="middle" x="420" y="81">78</text>
<text className="font-label-sm text-[10px] fill-[#75777f]" textAnchor="middle" x="420" y="175">9/20</text>
{/* Point 5: 82 pt (Active) */}
<circle cx="540" cy="79" fill="#1b2a4a" r="6" stroke="#d9e2ff" strokeWidth="3"></circle>
<text className="font-label-md text-[12px] fill-[#041534] font-bold" textAnchor="middle" x="540" y="66">82 (latest)</text>
<text className="font-label-sm text-[10px] fill-[#191c1e] font-semibold" textAnchor="middle" x="540" y="175">9/25</text>
</svg>}
</div>
</div>

{/* Growth Callout Footnote */}
<div className="mt-space-md p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between gap-space-sm">
<div className="flex items-center gap-space-sm min-w-0">
<span className="p-1 rounded bg-tertiary-fixed text-on-tertiary-fixed">
<span className="inline-flex shrink-0 items-center justify-center text-[16px]"><Icon name="verified" /></span>
</span>
<p className="font-body-sm text-body-sm text-on-surface">
<strong>Progress:</strong> <span className="text-secondary font-bold">No data</span> until your first scored interview.
          </p>
</div>
<button type="button" className="font-label-sm text-label-sm text-secondary hover:text-primary font-semibold whitespace-nowrap flex items-center" data-mock="progress-analytics">
          View Analytics
          <span className="inline-flex shrink-0 items-center justify-center text-[14px]"><Icon name="arrow_forward" /></span>
</button>
</div>
</div>
{/* Right: Telemetry & Skill Breakdown (4 Cols) */}
<div className="lg:col-span-5 xl:col-span-4 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div>
<div className="flex items-center justify-between mb-space-md">
<h2 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-1.5">
<span className="inline-flex shrink-0 items-center justify-center text-[20px] text-primary"><Icon name="stacked_bar_chart" /></span>
            Skill Breakdown
          </h2>
<span className="font-label-sm text-label-sm text-on-surface-variant">0 assessments</span>
</div>
<div className="space-y-space-md">
{/* Skill 1 */}
<div className="space-y-1">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-on-surface font-medium flex items-center gap-1">
<span>Motivation &amp; Self-Promotion</span>
</span>
<span className="font-label-md text-label-md font-bold text-primary">0%</span>
</div>
<div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
<div className="bg-secondary h-full rounded-full" style={{ width: "0%" }}></div>
</div>
<p className="font-furigana text-furigana text-on-surface-variant">No assessment data yet.</p>
</div>
{/* Skill 2 */}
<div className="space-y-1">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-on-surface font-medium flex items-center gap-1">
<span>Technical Explanation (PREP)</span>
</span>
<span className="font-label-md text-label-md font-bold text-primary">0%</span>
</div>
<div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
<div className="bg-tertiary-container h-full rounded-full" style={{ width: "0%" }}></div>
</div>
<p className="font-furigana text-furigana text-on-surface-variant">No assessment data yet.</p>
</div>
{/* Skill 3 */}
<div className="space-y-1">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-on-surface font-medium flex items-center gap-1">
<span>Keigo &amp; Business Japanese · <span lang="ja">敬語</span></span>
</span>
<span className="font-label-md text-label-md font-bold text-primary">0%</span>
</div>
<div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
<div className="bg-secondary h-full rounded-full" style={{ width: "0%" }}></div>
</div>
<p className="font-furigana text-furigana text-on-surface-variant">No assessment data yet.</p>
</div>
{/* Skill 4 - Focus */}
<div className="space-y-1 p-2 rounded-lg bg-surface-container-low">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1">
<span>Questions &amp; Communication</span>
</span>
<div className="flex items-center gap-1.5">
<span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-[10px] font-bold">No data</span>
<span className="font-label-md text-label-md font-bold text-error">0%</span>
</div>
</div>
<div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
<div className="bg-error h-full rounded-full" style={{ width: "0%" }}></div>
</div>
<p className="font-furigana text-furigana text-error font-medium">No assessment data yet.</p>
</div>
</div>
</div>
<div className="pt-space-md">
<button type="button" className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-semibold transition-colors" data-mock="practice-weaknesses">
<span className="inline-flex shrink-0 items-center justify-center text-[16px]"><Icon name="tune" /></span>
          Practice Focus Areas
        </button>
</div>
</div>
</div>
{/* ==========================================
       4. AI RECOMMENDED PRACTICE (弱点克服ドリル)
       ========================================== */}
<div id="practice" className="scroll-mt-24 space-y-space-sm">
<div className="flex flex-wrap items-center justify-between gap-space-sm">
<div className="flex items-center gap-2">
<span className="p-1.5 rounded-lg bg-primary text-on-primary">
<span className="inline-flex shrink-0 items-center justify-center text-[18px]"><Icon name="psychology" /></span>
</span>
<div>
<h2 className="font-headline-sm text-headline-sm font-bold text-primary">
            Recommended Practice
          </h2>
<span className="font-body-sm text-body-sm text-on-surface-variant">Personalized drills based on your recent mock interviews.</span>
</div>
</div>
<button type="button" className="font-label-md text-label-md text-secondary hover:text-primary font-semibold flex items-center gap-1" data-mock="practice-weaknesses">
        View All (5)
        <span className="inline-flex shrink-0 items-center justify-center text-[16px]"><Icon name="arrow_forward" /></span>
</button>
</div>
<div className="rounded-xl bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">No personalized practice recommendations yet.</div>
<div className="hidden grid-cols-1 md:grid-cols-3 gap-space-md">
{/* Drill Card 1: High Priority */}
<div className="relative bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
<div className="absolute -top-2.5 left-4">
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-[10px] font-bold uppercase tracking-wider shadow-sm">
<span className="inline-flex shrink-0 items-center justify-center text-[12px]"><Icon name="priority_high" /></span> High Priority
          </span>
</div>
<div className="pt-2">
<div className="flex items-center justify-between text-on-surface-variant mb-2">
<span className="font-label-sm text-label-sm flex items-center gap-1">
<span className="inline-flex shrink-0 items-center justify-center text-[14px] text-secondary"><Icon name="contact_support" /></span>
              Questions for the Interviewer
            </span>
<span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-low font-medium">10 min</span>
</div>
<h3 className="font-title text-title font-bold text-primary group-hover:text-secondary transition-colors">
            Ask Better Questions · <span lang="ja">逆質問</span>
          </h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-relaxed">
            Go beyond <span lang="ja">「特に質問はありません」</span> (“I have no questions”). Practice 5 thoughtful questions about engineering teams and CI/CD pipelines.
          </p>
<div className="mt-3 flex items-center gap-1 text-on-tertiary-fixed-variant bg-tertiary-fixed/30 px-2 py-1 rounded font-furigana text-furigana">
<span className="inline-flex shrink-0 items-center justify-center text-[14px]"><Icon name="lightbulb" /></span>
            Example: <span lang="ja">「貴社のマイクロサービス移行における課題について伺えますか」</span> — Could you share the challenges of your microservices migration?
          </div>
</div>
<div className="mt-space-md pt-space-sm">
<button type="button" className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-primary text-on-primary hover:bg-secondary font-label-md text-label-md font-semibold transition-colors shadow-sm" data-mock="practice-weaknesses">
<span className="inline-flex shrink-0 items-center justify-center text-[18px]"><Icon name="play_circle" /></span>
            Start Drill
          </button>
</div>
</div>
{/* Drill Card 2 */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
<div>
<div className="flex items-center justify-between text-on-surface-variant mb-2">
<span className="font-label-sm text-label-sm flex items-center gap-1">
<span className="inline-flex shrink-0 items-center justify-center text-[14px] text-tertiary-container"><Icon name="spellcheck" /></span>
              Grammar &amp; Particles
            </span>
<span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-low font-medium">5 min</span>
</div>
<h3 className="font-title text-title font-bold text-primary group-hover:text-secondary transition-colors">
            Master Particles · <span lang="ja">「〜に興味があります」</span>
          </h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-relaxed">
            Practice <span lang="ja">「〜に興味があります」</span> (“I am interested in…”). Identify missing or incorrect particles and build natural interview answers.
          </p>
<div className="mt-3 flex items-center gap-1 text-on-surface-variant bg-surface-container-low px-2 py-1 rounded font-furigana text-furigana">
<span className="inline-flex shrink-0 items-center justify-center text-[14px]"><Icon name="autorenew" /></span>
            Build fluency by listening and repeating aloud.
          </div>
</div>
<div className="mt-space-md pt-space-sm">
<button type="button" className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-semibold transition-colors" data-mock="practice-weaknesses">
<span className="inline-flex shrink-0 items-center justify-center text-[18px]"><Icon name="play_circle" /></span>
            Practice Particles (5 min)
          </button>
</div>
</div>
{/* Drill Card 3 */}
<div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
<div>
<div className="flex items-center justify-between text-on-surface-variant mb-2">
<span className="font-label-sm text-label-sm flex items-center gap-1">
<span className="inline-flex shrink-0 items-center justify-center text-[14px] text-secondary"><Icon name="terminal" /></span>
              Technical Interview · PREP
            </span>
<span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-low font-medium">15 min</span>
</div>
<h3 className="font-title text-title font-bold text-primary group-hover:text-secondary transition-colors">
            Explain Technical Challenges with PREP
          </h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-relaxed">
            Tell AI interviewer Tanaka about a difficult bug and how you solved it. Structure your answer with PREP: Point, Reason, Example, Point.
          </p>
<div className="mt-3 flex items-center gap-1 text-on-surface-variant bg-surface-container-low px-2 py-1 rounded font-furigana text-furigana">
<span className="inline-flex shrink-0 items-center justify-center text-[14px]"><Icon name="smart_toy" /></span>
            AI interviewer: Tanaka · Senior Tech Lead
          </div>
</div>
<div className="mt-space-md pt-space-sm">
<button type="button" className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-semibold transition-colors" data-mock="practice-weaknesses">
<span className="inline-flex shrink-0 items-center justify-center text-[18px]"><Icon name="play_circle" /></span>
            Practice with AI (15 min)
          </button>
</div>
</div>
</div>
</div>
{/* ==========================================
       5. ACTIVE PREP CONTEXT & TARGET JOB PROFILE
       ========================================== */}
<div id="profile" className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
{/* Target Job & Active Profile (8 Cols) */}
<div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
<div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm">
<div className="flex items-center gap-2">
<span className="p-1.5 rounded-lg bg-secondary-fixed text-on-secondary-fixed">
<span className="inline-flex shrink-0 items-center justify-center text-[20px]"><Icon name="badge" /></span>
</span>
<div>
<h2 className="font-headline-sm text-headline-sm font-bold text-primary">Target Job &amp; CV</h2>
<span className="font-body-sm text-body-sm text-on-surface-variant">Your job description and CV provide context for personalized interview questions.</span>
</div>
</div>
<button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high font-label-md text-label-md text-primary font-semibold transition-colors" data-mock="my-cv">
<span className="inline-flex shrink-0 items-center justify-center text-[16px]"><Icon name="edit_document" /></span>
          Update CV
        </button>
</div>
<div className="mt-space-sm rounded-xl bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">No CV or target job has been saved to your account yet.</div>
<div className="hidden mt-space-sm p-space-md rounded-xl bg-surface-container-low space-y-space-md">
{/* Target JD Banner */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
<div className="space-y-1">
<div className="flex items-center gap-2">
<span className="px-2 py-0.5 rounded bg-primary text-on-primary font-label-sm text-[11px] font-bold">TARGET JD</span>
<span className="font-label-sm text-label-sm text-secondary font-semibold">Match: 88%</span>
</div>
<h3 className="font-title text-title font-bold text-primary">Rakuten Symphony - Cloud Platform &amp; Web Application Engineer</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant">
              Requirements: PHP/Laravel or Go/Java, RDBMS, REST APIs, and business Japanese (N2+).
            </p>
</div>
<button type="button" className="self-start sm:self-center inline-flex items-center gap-1 text-secondary font-label-md text-label-md font-semibold hover:underline" data-mock="job-description">
            View Job Details
            <span className="inline-flex shrink-0 items-center justify-center text-[16px]"><Icon name="open_in_new" /></span>
</button>
</div>
{/* Candidate CV Extracted Bullets */}
<div className="space-y-space-xs">
<span className="font-label-sm text-label-sm text-on-surface-variant font-semibold uppercase tracking-wider">CV Highlights for Your Interview</span>
<div className="grid grid-cols-1 md:grid-cols-3 gap-space-xs pt-1">
<div className="p-2.5 rounded bg-surface-container-lowest shadow-sm space-y-1">
<span className="font-label-sm text-label-sm font-bold text-primary flex items-center gap-1">
<span className="inline-flex shrink-0 items-center justify-center text-[16px] text-tertiary-container"><Icon name="shopping_cart" /></span>
                VKU E-commerce Payments
              </span>
<p className="font-furigana text-furigana text-on-surface-variant leading-relaxed">
                Built a Laravel + Next.js payment platform with 3D Secure 2.0, database transactions, and idempotency.
              </p>
</div>
<div className="p-2.5 rounded bg-surface-container-lowest shadow-sm space-y-1">
<span className="font-label-sm text-label-sm font-bold text-primary flex items-center gap-1">
<span className="inline-flex shrink-0 items-center justify-center text-[16px] text-secondary"><Icon name="apartment" /></span>
                9-Month Engineering Internship
              </span>
<p className="font-furigana text-furigana text-on-surface-variant leading-relaxed">
                Designed backend APIs and fixed bugs at a Japanese offshore company in Da Nang, with daily updates to a Japanese PM.
              </p>
</div>
<div className="p-2.5 rounded bg-surface-container-lowest shadow-sm space-y-1">
<span className="font-label-sm text-label-sm font-bold text-primary flex items-center gap-1">
<span className="inline-flex shrink-0 items-center justify-center text-[16px] text-primary"><Icon name="groups" /></span>
                Team Leadership
              </span>
<p className="font-furigana text-furigana text-on-surface-variant leading-relaxed">
                Led a 4-student VKU graduation project, setting up Docker environments and a shared Git workflow.
              </p>
</div>
</div>
</div>
</div>
</div>
{/* Right: Interview Simulation Setup Card (4 Cols) */}
<div className="lg:col-span-4 bg-gradient-to-b from-surface-container-lowest to-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col justify-between">
<div className="space-y-space-md">
<div className="flex items-center justify-between">
<span className="font-label-md text-label-md font-bold text-primary flex items-center gap-1.5">
<span className="inline-flex shrink-0 items-center justify-center text-[18px] text-secondary"><Icon name="settings_suggest" /></span>
            Interview Preset
          </span>
<span className="inline-flex items-center px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold">READY</span>
</div>
<div className="p-space-sm rounded-lg bg-surface-container-lowest shadow-sm space-y-space-xs">
<div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 text-body-sm">
<span className="text-on-surface-variant">Interview type:</span>
<span className="font-semibold text-primary">First round · Technical &amp; Motivation</span>
</div>
<div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 text-body-sm">
<span className="text-on-surface-variant">Interviewer:</span>
<span className="font-semibold text-primary">Tanaka · Tech Lead</span>
</div>
<div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 text-body-sm">
<span className="text-on-surface-variant">Japanese level:</span>
<span className="font-semibold text-primary">JLPT N2+ · Business pace</span>
</div>
<div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-1 text-body-sm">
<span className="text-on-surface-variant">Questions:</span>
<span className="font-semibold text-primary">6 questions · About 20 min</span>
</div>
</div>
<div className="text-on-surface-variant font-body-sm text-body-sm space-y-1">
<div className="flex items-center gap-1.5">
<span className="inline-flex shrink-0 items-center justify-center text-[16px] text-tertiary-container"><Icon name="check_circle" /></span>
<span>Camera &amp; microphone check (demo)</span>
</div>
<div className="flex items-center gap-1.5">
<span className="inline-flex shrink-0 items-center justify-center text-[16px] text-tertiary-container"><Icon name="check_circle" /></span>
<span>Pronunciation &amp; keigo feedback (demo)</span>
</div>
</div>
</div>
<div className="pt-space-md">
<button type="button" className="w-full inline-flex items-center justify-center gap-2 py-3 px-space-md rounded-lg bg-primary hover:bg-secondary text-on-primary font-label-lg text-label-lg font-bold transition-all shadow-md" data-mock="interview-room">
<span className="inline-flex shrink-0 items-center justify-center text-[20px]"><Icon name="videocam" /></span>
          Start Mock Interview
        </button>
</div>
</div>
</div>
{/* ==========================================
       6. RECENT INTERVIEW HISTORY TABLE
       ========================================== */}
<div id="history" className="min-w-0 scroll-mt-24 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
<div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md">
<div>
<h2 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-2">
<span className="inline-flex shrink-0 items-center justify-center text-[22px] text-primary"><Icon name="history" /></span>
          Recent Interviews &amp; AI Reports
        </h2>
<span className="font-body-sm text-body-sm text-on-surface-variant">Review session results and feedback on areas for improvement.</span>
</div>
<button type="button" className="font-label-md text-label-md text-secondary hover:text-primary font-semibold flex items-center gap-1" data-mock="interview-history">
        View All History
        <span className="inline-flex shrink-0 items-center justify-center text-[16px]"><Icon name="arrow_forward" /></span>
</button>
</div>
{/* Table Container */}
<div className="overflow-x-auto">
<table aria-label="Recent mock interview history" className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
<th scope="col" className="py-3 px-space-md rounded-l">Date &amp; Time</th>
<th scope="col" className="py-3 px-space-md">Position / Company</th>
<th scope="col" className="py-3 px-space-md">Level</th>
<th scope="col" className="py-3 px-space-md">Score</th>
<th scope="col" className="py-3 px-space-md">Status</th>
<th scope="col" className="py-3 px-space-md text-right rounded-r">Action</th>
</tr>
</thead>
<tbody aria-hidden="true" className="hidden">
{/* Row 1 */}
<tr className="hover:bg-surface transition-colors">
<td className="py-3.5 px-space-md font-label-md text-label-md text-on-surface whitespace-nowrap">
              Sep 25, 2026 20:30
            </td>
<td className="py-3.5 px-space-md">
<div className="font-semibold text-primary">IT Engineer Interview (Rakuten JD)</div>
<div className="font-furigana text-furigana text-on-surface-variant">First round · Technical skills &amp; motivation</div>
</td>
<td className="py-3.5 px-space-md whitespace-nowrap">
<span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">N2</span>
</td>
<td className="py-3.5 px-space-md whitespace-nowrap">
<span className="font-headline-sm text-headline-sm font-bold text-primary">82</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">/ 100</span>
</td>
<td className="py-3.5 px-space-md whitespace-nowrap">
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary-container text-tertiary-fixed font-label-sm text-label-sm font-bold">
<span className="inline-flex shrink-0 items-center justify-center text-[14px]"><Icon name="check_circle" /></span>
                Benchmark Passed
              </span>
</td>
<td className="py-3.5 px-space-md text-right whitespace-nowrap">
<button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-secondary hover:text-on-secondary text-primary font-label-md text-label-md font-semibold transition-all" data-mock="interview-history">
<span>View Report</span>
<span className="inline-flex shrink-0 items-center justify-center text-[16px]"><Icon name="chevron_right" /></span>
</button>
</td>
</tr>
{/* Row 2 */}
<tr className="hover:bg-surface transition-colors">
<td className="py-3.5 px-space-md font-label-md text-label-md text-on-surface whitespace-nowrap">
              Sep 20, 2026 19:15
            </td>
<td className="py-3.5 px-space-md">
<div className="font-semibold text-primary">Technical Deep Dive (Laravel / MySQL Design)</div>
<div className="font-furigana text-furigana text-on-surface-variant">In-depth technical discussion</div>
</td>
<td className="py-3.5 px-space-md whitespace-nowrap">
<span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">N2</span>
</td>
<td className="py-3.5 px-space-md whitespace-nowrap">
<span className="font-headline-sm text-headline-sm font-bold text-secondary">78</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">/ 100</span>
</td>
<td className="py-3.5 px-space-md whitespace-nowrap">
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-semibold">
                Good
              </span>
</td>
<td className="py-3.5 px-space-md text-right whitespace-nowrap">
<button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-secondary hover:text-on-secondary text-primary font-label-md text-label-md font-semibold transition-all" data-mock="interview-history">
<span>View Report</span>
<span className="inline-flex shrink-0 items-center justify-center text-[16px]"><Icon name="chevron_right" /></span>
</button>
</td>
</tr>
{/* Row 3 */}
<tr className="hover:bg-surface transition-colors">
<td className="py-3.5 px-space-md font-label-md text-label-md text-on-surface whitespace-nowrap">
              Sep 15, 2026 21:00
            </td>
<td className="py-3.5 px-space-md">
<div className="font-semibold text-primary">Japanese General Business Interview</div>
<div className="font-furigana text-furigana text-on-surface-variant">Business etiquette &amp; self-promotion</div>
</td>
<td className="py-3.5 px-space-md whitespace-nowrap">
<span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">N2</span>
</td>
<td className="py-3.5 px-space-md whitespace-nowrap">
<span className="font-headline-sm text-headline-sm font-bold text-outline">74</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">/ 100</span>
</td>
<td className="py-3.5 px-space-md whitespace-nowrap">
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">
                Needs Work
              </span>
</td>
<td className="py-3.5 px-space-md text-right whitespace-nowrap">
<button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-secondary hover:text-on-secondary text-primary font-label-md text-label-md font-semibold transition-all" data-mock="interview-history">
<span>View Report</span>
<span className="inline-flex shrink-0 items-center justify-center text-[16px]"><Icon name="chevron_right" /></span>
</button>
</td>
</tr>
{/* Row 4 */}
<tr className="hover:bg-surface transition-colors">
<td className="py-3.5 px-space-md font-label-md text-label-md text-on-surface whitespace-nowrap">
              Sep 08, 2026 17:45
            </td>
<td className="py-3.5 px-space-md">
<div className="font-semibold text-primary">Self-Introduction &amp; Motivation Drill</div>
<div className="font-furigana text-furigana text-on-surface-variant">Initial assessment</div>
</td>
<td className="py-3.5 px-space-md whitespace-nowrap">
<span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-semibold">N3+</span>
</td>
<td className="py-3.5 px-space-md whitespace-nowrap">
<span className="font-headline-sm text-headline-sm font-bold text-outline">68</span>
<span className="font-body-sm text-body-sm text-on-surface-variant">/ 100</span>
</td>
<td className="py-3.5 px-space-md whitespace-nowrap">
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
                Completed
              </span>
</td>
<td className="py-3.5 px-space-md text-right whitespace-nowrap">
<button type="button" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-secondary hover:text-on-secondary text-primary font-label-md text-label-md font-semibold transition-all" data-mock="interview-history">
<span>View Report</span>
<span className="inline-flex shrink-0 items-center justify-center text-[16px]"><Icon name="chevron_right" /></span>
</button>
</td>
</tr>
</tbody>
<tbody className="font-body-md text-body-md divide-y divide-surface-container">
{sessions.map((session) => <tr key={session.id} className="hover:bg-surface transition-colors">
<td className="py-3.5 px-space-md whitespace-nowrap">{session.completed_at ? dateFormat.format(new Date(session.completed_at)) : "In progress"}</td>
<td className="py-3.5 px-space-md"><div className="font-semibold text-primary">{session.title}</div>{session.company && <div className="text-xs text-on-surface-variant">{session.company}</div>}</td>
<td className="py-3.5 px-space-md">{session.level || "—"}</td><td className="py-3.5 px-space-md">{session.score ?? "—"}</td>
<td className="py-3.5 px-space-md capitalize">{session.status.replaceAll("_", " ")}</td><td className="py-3.5 px-space-md text-right">—</td>
</tr>)}
</tbody>
</table>
{error ? <p role="alert" className="mt-3 text-sm text-error">Cannot load sessions. Apply the SQL migration in supabase/migrations/.</p> : sessions.length === 0 && <p className="py-8 text-center text-sm text-on-surface-variant">No interviews yet. Saved sessions will appear here.</p>}
</div>
</div>
{/* Inline Micro-interaction Script for Dashboard */}

</div>
    </DashboardShell>
  );
}
