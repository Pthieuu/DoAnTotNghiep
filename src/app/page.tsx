import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Icon from "@/components/icon";
import Image from "next/image";

export default async function Home() {
  const user = await getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col selection:bg-secondary-fixed selection:text-primary">
      {/* 1. Sleek, Minimalist Navigation Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-surface-container shadow-xs">
        <div className="max-w-7xl mx-auto h-18 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8 shrink-0">
            <a className="flex items-center gap-2" href="#">
              <Image
                src="/logo.svg"
                alt="Aizuchi.AI — AI Japanese Interview Trainer"
                width={150}
                height={36}
                className="h-9 w-auto"
                priority
              />
            </a>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-on-surface-variant">
              <a href="#features" className="hover:text-primary transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
              <a href="#demo" className="hover:text-primary transition-colors">Live Demo</a>
              <a href="#questions" className="hover:text-primary transition-colors">Question Bank</a>
              <a href="#stories" className="hover:text-primary transition-colors">Reviews</a>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/login"
              className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
            >
              Log In
            </a>
            <a
              href="/login"
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-secondary shadow-xs transition-all"
            >
              Start Free Practice
            </a>
          </div>
        </div>
      </header>

      <main className="w-full pt-18 flex-1">
        {/* 2. Hero Section */}
        <section className="relative w-full py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-surface via-surface-container-low/40 to-surface">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Hero Left Column: Clear Value Prop */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Clean Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-surface-container shadow-2xs w-fit">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-secondary tracking-wide">
                  AI-Powered Japanese Job Interview Coach
                </span>
                <span className="text-surface-container-highest">·</span>
                <span className="text-xs text-on-surface-variant font-medium">JLPT N3–N1</span>
              </div>

              {/* Headline */}
              <div className="flex flex-col gap-3">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-[1.15]">
                  Master Your Japanese Tech Interview with AI
                </h1>
                <p className="text-lg sm:text-xl font-medium text-secondary">
                  Realistic voice mock interviews tailored to your resume, tech stack, and target job in Japan.
                </p>
              </div>

              {/* Subtitle Description */}
              <p className="text-base text-on-surface-variant max-w-xl leading-relaxed">
                Practice technical and behavioral questions with an adaptive 3D AI interviewer. Get instant feedback on Keigo formality, technical reasoning, and PREP structure.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <a
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-secondary shadow-md transition-all text-center"
                >
                  <span>Start Free Interview</span>
                  <Icon name="arrow_forward" className="text-sm" />
                </a>
                <a
                  href="#demo"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-surface-container bg-white hover:bg-surface-container text-primary font-semibold text-sm shadow-xs transition-colors text-center"
                >
                  <Icon name="play_circle" className="text-base text-secondary" />
                  <span>Interactive Preview</span>
                </a>
              </div>

              {/* Trust Indicators & Social Proof */}
              <div className="pt-6 border-t border-surface-container flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-sm text-on-surface">
                  <div className="flex text-amber-500 text-xs tracking-widest">★★★★★</div>
                  <span className="font-semibold text-primary">91.4% First-Round Pass Rate</span>
                  <span className="text-surface-container-highest">·</span>
                  <span className="text-on-surface-variant text-xs">Over 3,200 candidates prepared</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Offers received at: <span className="font-medium text-primary">Rakuten • Mercari • LINE Yahoo • SoftBank • CyberAgent</span>
                </p>
              </div>
            </div>

            {/* Hero Right Column: Clean, Elegant Live Simulator Card */}
            <div className="lg:col-span-5 relative" id="demo">
              <div className="w-full bg-white rounded-2xl shadow-xl border border-surface-container overflow-hidden flex flex-col">
                
                {/* Clean Window Header */}
                <div className="px-4 py-3 bg-surface-container-low border-b border-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-primary">
                      Hiro (AI Interviewer)
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                      Live Voice
                    </span>
                  </div>
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    Software Engineer • N2
                  </span>
                </div>

                {/* Simulated Conversation Flow */}
                <div className="p-4 sm:p-5 flex flex-col gap-3.5 bg-surface-container-lowest">
                  
                  {/* AI Turn */}
                  <div className="flex items-start gap-2.5">
                    <div className="size-8 rounded-full bg-primary flex items-center justify-center shrink-0 text-white shadow-xs">
                      <Icon name="psychology" className="text-base" />
                    </div>
                    <div className="flex flex-col gap-1 max-w-[88%]">
                      <div className="bg-surface-container-low p-3 rounded-2xl rounded-tl-xs text-primary text-sm leading-relaxed">
                        「これまでの開発経験と、最も苦労した技術的な課題について教えてください。」
                      </div>
                      <p className="text-[11px] text-on-surface-variant italic px-1">
                        &ldquo;Please introduce your development experience and the most challenging technical problem you solved.&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Candidate Turn */}
                  <div className="flex items-start justify-end gap-2.5">
                    <div className="flex flex-col items-end gap-1 max-w-[88%]">
                      <div className="bg-primary text-white p-3 rounded-2xl rounded-tr-xs text-sm leading-relaxed shadow-xs">
                        「はい。決済基盤のマイクロサービス移行において、分散トランザクションの整合性設計を担当いたしました。」
                      </div>
                      <p className="text-[11px] text-on-surface-variant italic px-1 text-right">
                        &ldquo;During our microservice migration, I designed the distributed transaction consistency.&rdquo;
                      </p>
                    </div>
                    <div className="size-8 rounded-full bg-secondary-container flex items-center justify-center shrink-0 text-on-secondary-container text-xs font-bold">
                      YOU
                    </div>
                  </div>

                  {/* Real-time AI Evaluation Card (Clean & Focused) */}
                  <div className="mt-2 p-3.5 rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <Icon name="insights" className="text-sm text-secondary" />
                        <span>Instant AI Feedback</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                        Score: 88 / 100
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-xs text-on-surface">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <Icon name="check_circle" className="text-xs" />
                        <span>Clear PREP structure: direct opening point with measurable scope.</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-secondary font-medium">
                        <Icon name="lightbulb" className="text-xs" />
                        <span>Keigo check: appropriate humble phrasing 「担当いたしました」 used correctly.</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Subtle Interactive Audio Status Bar */}
                <div className="px-4 py-2.5 bg-surface-container-low border-t border-surface-container flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 h-3">
                      <span className="w-1 bg-secondary h-full rounded-full animate-pulse" />
                      <span className="w-1 bg-secondary h-2/3 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 bg-secondary h-4/5 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-on-surface-variant font-medium">
                      AI is listening to your answer...
                    </span>
                  </div>
                  <span className="text-xs font-mono text-secondary font-semibold">
                    04:12 / 15:00
                  </span>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* How It Works (3 Simple Steps) */}
        <section id="how-it-works" className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-surface">
          <div className="max-w-7xl mx-auto flex flex-col gap-12">
            <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                How It Works
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-primary tracking-tight">
                Get interview-ready in three simple steps
              </h2>
              <p className="text-base text-on-surface-variant">
                Upload your resume, select your target role, and practice with realistic questions derived directly from your experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="size-9 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center">
                    1
                  </span>
                  <span className="text-xs font-semibold text-on-surface-variant uppercase">
                    Step 01
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-primary">Upload Resume &amp; Target JD</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Upload your CV in English or Japanese. Our AI extracts your core technologies, projects, and achievements to build a customized question plan.
                  </p>
                </div>
                <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-surface-container text-xs font-medium text-primary">TypeScript</span>
                  <span className="px-2.5 py-1 rounded-lg bg-surface-container text-xs font-medium text-primary">Next.js</span>
                  <span className="px-2.5 py-1 rounded-lg bg-surface-container text-xs font-medium text-primary">PostgreSQL</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="size-9 rounded-xl bg-secondary text-white font-bold text-sm flex items-center justify-center">
                    2
                  </span>
                  <span className="text-xs font-semibold text-on-surface-variant uppercase">
                    Step 02
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-primary">Practice Voice Conversation</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Engage in a live voice session with the 3D interviewer. Experience natural Japanese conversational tempo and deep technical follow-ups.
                  </p>
                </div>
                <div className="mt-auto pt-2 flex items-center gap-2 text-xs text-secondary font-medium">
                  <Icon name="record_voice_over" className="text-base" />
                  <span>Real-time voice streaming with Gemini Live</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="size-9 rounded-xl bg-emerald-700 text-white font-bold text-sm flex items-center justify-center">
                    3
                  </span>
                  <span className="text-xs font-semibold text-on-surface-variant uppercase">
                    Step 03
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-primary">Review Rubric &amp; Feedback</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Receive comprehensive grading across 5 rubric criteria: Keigo, Technical Depth, STAR structure, Fluency, and Culture Fit.
                  </p>
                </div>
                <div className="mt-auto pt-2 flex items-center gap-2 text-xs text-emerald-700 font-medium">
                  <Icon name="verified" className="text-base" />
                  <span>Personalized model answers &amp; recommendations</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Core Features Bento Grid */}
        <section id="features" className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-surface-container-low/50">
          <div className="max-w-7xl mx-auto flex flex-col gap-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-3 max-w-xl">
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Features &amp; Advantages
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-primary tracking-tight">
                  Why engineers choose Aizuchi.AI
                </h2>
                <p className="text-base text-on-surface-variant">
                  Designed specifically around Japanese hiring standards and technical interview requirements.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="bg-white p-6 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-3">
                <div className="size-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                  <Icon name="manage_accounts" className="text-xl" />
                </div>
                <h3 className="text-lg font-bold text-primary">Personalized to Your Resume</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Every technical question directly quotes your actual achievements and tools, ensuring practice aligns with your true experience.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white p-6 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-3">
                <div className="size-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                  <Icon name="account_tree" className="text-xl" />
                </div>
                <h3 className="text-lg font-bold text-primary">Adaptive Follow-Up Questions</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Japanese tech leads probe into trade-offs and decision-making. The AI dynamically follows up on your answers to test depth.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white p-6 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-3">
                <div className="size-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                  <Icon name="spellcheck" className="text-xl" />
                </div>
                <h3 className="text-lg font-bold text-primary">Keigo &amp; Formality Guidance</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Identify grammar nuances, particle slips, and master polite, humble, and honorific phrasing expected in corporate Japan.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white p-6 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-3">
                <div className="size-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                  <Icon name="graphic_eq" className="text-xl" />
                </div>
                <h3 className="text-lg font-bold text-primary">Speech Pace &amp; Fluency</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Maintain the natural Japanese interview cadence of 300–350 mora per minute with real-time feedback on speech pauses and rhythm.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-white p-6 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-3">
                <div className="size-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                  <Icon name="track_changes" className="text-xl" />
                </div>
                <h3 className="text-lg font-bold text-primary">STAR &amp; PREP Structuring</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Structure answers clearly using PREP (Point, Reason, Example, Point) to deliver concise, compelling technical stories.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-white p-6 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-3">
                <div className="size-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                  <Icon name="assessment" className="text-xl" />
                </div>
                <h3 className="text-lg font-bold text-primary">Objective 5-Criteria Rubric</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Standardized rubric grading with actionable recommendations to help you systematically track progress over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Success Stories */}
        <section id="stories" className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-surface">
          <div className="max-w-7xl mx-auto flex flex-col gap-12">
            <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                Success Stories
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-primary tracking-tight">
                Empowering international engineers in Japan
              </h2>
              <p className="text-base text-on-surface-variant">
                See how candidates prepared with Aizuchi.AI to secure offers at top Japanese technology firms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Story 1 */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-surface-container shadow-xs flex flex-col justify-between gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center">
                      AC
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary">Alex Chen</h4>
                      <p className="text-xs text-on-surface-variant">Backend Engineer • JLPT N2</p>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    &ldquo;I knew my tech stack well, but explaining database indexing and concurrency in Japanese was intimidating. Aizuchi.AI helped me turn technical concepts into fluent, structured Japanese answers.&rdquo;
                  </p>
                </div>
                <div className="pt-3 border-t border-surface-container flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant">Hired at:</span>
                  <span className="font-bold text-primary">Rakuten Symphony</span>
                </div>
              </div>

              {/* Story 2 */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-surface-container shadow-xs flex flex-col justify-between gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-secondary text-white font-bold text-sm flex items-center justify-center">
                      SL
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary">Sophia Lin</h4>
                      <p className="text-xs text-on-surface-variant">Frontend Developer • JLPT N1</p>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    &ldquo;The Keigo feedback was essential. It spotted subtle formality mistakes I didn&apos;t even realize I was making and gave me the confidence to ace my final-round interview.&rdquo;
                  </p>
                </div>
                <div className="pt-3 border-t border-surface-container flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant">Hired at:</span>
                  <span className="font-bold text-primary">LINE Yahoo</span>
                </div>
              </div>

              {/* Story 3 */}
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-surface-container shadow-xs flex flex-col justify-between gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-emerald-800 text-white font-bold text-sm flex items-center justify-center">
                      MK
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary">Michael Kim</h4>
                      <p className="text-xs text-on-surface-variant">DevOps &amp; Cloud • JLPT N3</p>
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    &ldquo;Practicing with the PREP framework transformed how I communicate. At N3, I was worried I wasn&apos;t ready, but the targeted practice helped me land an offer in Tokyo.&rdquo;
                  </p>
                </div>
                <div className="pt-3 border-t border-surface-container flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant">Hired at:</span>
                  <span className="font-bold text-primary">Mercari Japan</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Common Question Bank Preview */}
        <section id="questions" className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-surface-container-low/50">
          <div className="max-w-7xl mx-auto flex flex-col gap-10">
            <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                Practice Questions
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-primary tracking-tight">
                Explore frequent Japanese interview questions
              </h2>
              <p className="text-base text-on-surface-variant">
                Preview typical technical and cultural questions with structured answer frameworks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Question 1 */}
              <div className="bg-white p-6 rounded-2xl border border-surface-container shadow-xs flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-xs font-semibold text-primary">
                      System Design &amp; Architecture
                    </span>
                    <span className="text-xs text-secondary font-medium">Frequency: ★★★★★</span>
                  </div>
                  <h3 className="text-base font-bold text-primary pt-1">
                    &ldquo;Which architectural decision had the largest impact on system performance in your project?&rdquo;
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Strategy: Quantify your results (e.g. latency reduced by 60% through caching and read-replica distribution).
                  </p>
                </div>
                <div className="pt-2 border-t border-surface-container flex items-center justify-between text-xs font-medium text-secondary">
                  <span>Structure: PREP + Quantified Metrics</span>
                  <a href="/login" className="text-primary hover:text-secondary flex items-center gap-1 font-semibold">
                    <span>Practice</span>
                    <Icon name="arrow_forward" className="text-xs" />
                  </a>
                </div>
              </div>

              {/* Question 2 */}
              <div className="bg-white p-6 rounded-2xl border border-surface-container shadow-xs flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-xs font-semibold text-primary">
                      Motivation &amp; Culture Fit
                    </span>
                    <span className="text-xs text-secondary font-medium">Frequency: ★★★★★</span>
                  </div>
                  <h3 className="text-base font-bold text-primary pt-1">
                    &ldquo;Why do you want to pursue your engineering career in Japan?&rdquo;
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Strategy: Connect your career vision to large-scale products, craft standards, and team collaboration in Japanese tech.
                  </p>
                </div>
                <div className="pt-2 border-t border-surface-container flex items-center justify-between text-xs font-medium text-secondary">
                  <span>Structure: Career Goal + Cultural Fit</span>
                  <a href="/login" className="text-primary hover:text-secondary flex items-center gap-1 font-semibold">
                    <span>Practice</span>
                    <Icon name="arrow_forward" className="text-xs" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Call to Action Banner */}
        <section className="w-full bg-primary text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-6 relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Ready to ace your Japanese tech interview?
            </h2>
            <p className="text-base sm:text-lg text-surface-container max-w-xl leading-relaxed">
              Join thousands of engineers practicing realistic voice interviews with personalized AI coaching.
            </p>
            <div className="pt-2">
              <a
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary font-bold text-base hover:bg-surface-container-low shadow-lg transition-all"
              >
                <span>Start Free Mock Interview</span>
                <Icon name="arrow_forward" className="text-base" />
              </a>
            </div>
            <p className="text-xs text-surface-container-highest">
              No credit card required • Instant setup in under 60 seconds
            </p>
          </div>
        </section>
      </main>

      {/* 9. Clean Modern Footer */}
      <footer className="w-full bg-white border-t border-surface-container py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="Aizuchi.AI"
              width={130}
              height={32}
              className="h-8 w-auto"
            />
            <span className="text-xs text-on-surface-variant font-medium">
              © {new Date().getFullYear()} Aizuchi.AI. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-medium text-on-surface-variant">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
            <a href="/login" className="hover:text-primary transition-colors">Log In</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
