import Icon from "@/components/icon";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(4,21,52,0.05)]">
        <div className="h-20 w-full px-margin flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md shrink-0">
            <a
              className="flex flex-wrap items-center gap-space-sm"
              data-path="landing-home"
              href="#"
            >
              <Image
                src="/logo.svg"
                alt="Aizuchi.AI — AI Japanese Interview Trainer"
                width={160}
                height={40}
                className="h-10 w-40"
              />
            </a>
          </div>
          <nav
            className="hidden xl:flex items-center gap-space-xs p-1"
            data-active-classes="bg-surface-container-high text-on-surface font-label-md rounded-lg"
          >
            <a
              className="px-space-sm py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              data-path="features"
              href="#"
            >
              Features
            </a>
            <a
              className="px-space-sm py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              data-path="how-it-works"
              href="#"
            >
              How It Works
            </a>
            <a
              className="px-space-sm py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              data-path="vietnamese-students"
              href="#"
            >
              For Vietnamese Students
            </a>
            <a
              className="px-space-sm py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              data-path="pricing-plans"
              href="#"
            >
              Pricing
            </a>
            <a
              className="px-space-sm py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              data-path="success-stories"
              href="#"
            >
              Success Stories
            </a>
          </nav>
          <div className="flex items-center gap-space-sm shrink-0">
            <div className="relative hidden sm:flex items-center gap-1 px-space-sm py-1 rounded-lg bg-surface-container-low text-on-surface font-label-sm text-label-sm cursor-pointer hover:bg-surface-container transition-colors">
              <span className="inline-flex shrink-0 items-center justify-center align-middle text-[16px] text-on-surface-variant"><Icon name="translate" /></span>
              <span>EN</span>
            </div>
            <a
              className="px-space-md py-2 rounded-lg bg-surface-container-low text-primary font-label-md text-label-md hover:bg-surface-container hover:text-on-surface transition-colors"
              data-path="login"
              href="/login"
            >
              Log In
            </a>
            <a
              className="px-space-md py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all"
              data-path="free-demo"
              href="#"
            >
              Try for Free
            </a>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="inline-flex shrink-0 items-center justify-center align-middle text-on-primary text-[18px]"><Icon name="person" /></span>
            </div>
          </div>
        </div>
      </header>
      <main className="w-full pt-20 bg-surface">
        <div className="flex flex-col w-full overflow-hidden">
          {/* Top Announce Bar */}
          <section className="w-full bg-primary text-on-primary py-space-xs px-margin">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-space-sm text-center sm:text-left">
              <div className="flex items-center gap-space-sm mx-auto sm:mx-0">
                <span className="inline-flex items-center px-space-xs py-0.5 rounded-lg bg-tertiary-container text-tertiary-fixed text-label-sm font-label-sm">
                  NEW
                </span>
                <span className="font-body-sm text-body-sm text-surface-container">
                  Now available: interview preparation for the 2026 graduate hiring season
                </span>
              </div>
              <div className="hidden md:flex items-center gap-space-md text-label-sm font-label-sm text-secondary-fixed">
                <span className="flex items-center gap-1">
                  <span className="inline-flex shrink-0 items-center justify-center align-middle text-[15px]"><Icon name="verified" /></span>
                  Aligned with Rakuten, Mercari, and LINE Yahoo interviews
                </span>
                <span className="text-outline-variant">/</span>
                <span className="text-surface-container">
                  Vietnamese Bridge Support Enabled
                </span>
              </div>
            </div>
          </section>
          {/* Hero Section */}
          <section className="relative w-full bg-gradient-to-b from-surface via-surface-container-low to-surface py-space-xl px-margin">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
              {/* Hero Left: Value Prop */}
              <div className="lg:col-span-7 flex flex-col gap-space-md">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-space-xs">
                  <div className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm shadow-sm">
                    <span className="text-[14px]">🇻🇳</span>
                    <span>AI interview training for Vietnamese tech talent</span>
                  </div>
                  <div className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                    <span className="inline-flex shrink-0 items-center justify-center align-middle text-[14px] text-secondary"><Icon name="school" /></span>
                    <span>JLPT N3–N1 / Engineers &amp; Students</span>
                  </div>
                </div>
                {/* Headline */}
                <div className="flex flex-col gap-space-xs">
                  <h1 className="font-display text-display text-primary tracking-tight">
                    AI Japanese Interview Trainer
                  </h1>
                  <p className="font-headline-md text-headline-md text-secondary tracking-normal">
                    Mock interviews that adapt to your resume, target role, and answers.
                  </p>
                </div>
                {/* Lead Subtitle */}
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                  Practice Japanese job interviews with an AI interviewer
                  personalized to your experience, skills, and target job. Built
                  for Vietnamese university students and tech talents targeting
                  Japanese companies (Rakuten, Mercari, LINE Yahoo, SoftBank).
                </p>
                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm pt-space-xs">
                  <a
                    className="inline-flex items-center justify-center gap-space-xs px-space-lg py-3 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:bg-primary-container transition-all text-center"
                    data-path="free-mock-interview"
                    href="#"
                  >
                    <span>Start a Free Interview</span>
                    <span className="inline-flex shrink-0 items-center justify-center align-middle text-[18px]"><Icon name="arrow_forward" /></span>
                  </a>
                  <a
                    className="inline-flex items-center justify-center gap-space-xs px-space-lg py-3 rounded-lg bg-surface-container-lowest text-primary font-label-lg text-label-lg shadow-sm hover:bg-surface-container-high transition-colors text-center"
                    href="#interactive-demo"
                  >
                    <span className="inline-flex shrink-0 items-center justify-center align-middle text-[18px] text-secondary"><Icon name="play_circle" /></span>
                    <span>Watch the 3-Minute Demo</span>
                  </a>
                </div>
                {/* Social Proof Micro-Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-md pt-space-md bg-surface-container-lowest/80 p-space-md rounded-xl shadow-sm">
                  <div className="flex -space-x-2">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary text-label-sm font-label-sm shadow-sm">
                      VKU
                    </div>
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-on-secondary text-label-sm font-label-sm shadow-sm">
                      HUST
                    </div>
                    <div className="w-9 h-9 rounded-full bg-tertiary-container flex items-center justify-center text-tertiary-fixed text-label-sm font-label-sm shadow-sm">
                      UET
                    </div>
                    <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-primary text-label-sm font-label-sm shadow-sm">
                      +3k
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-primary">
                      <span className="font-headline-sm text-headline-sm">
                        3,200+
                      </span>
                      <span className="font-label-md text-label-md text-on-surface-variant">
                        Vietnamese Tech Candidates
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Students from VKU (Da Nang), HUST (Hanoi), and VNU-UET •
                      <span className="text-primary font-title">
                        91.4% first-round pass rate
                      </span>
                    </p>
                  </div>
                </div>
                {/* Target Company Chips */}
                <div className="flex items-center gap-space-sm pt-space-xs flex-wrap">
                  <span className="font-label-sm text-label-sm text-outline">
                    Offers from:
                  </span>
                  <span className="px-space-sm py-1 rounded bg-surface-container text-on-surface font-label-sm text-label-sm">
                    Rakuten Symphony
                  </span>
                  <span className="px-space-sm py-1 rounded bg-surface-container text-on-surface font-label-sm text-label-sm">
                    Mercari
                  </span>
                  <span className="px-space-sm py-1 rounded bg-surface-container text-on-surface font-label-sm text-label-sm">
                    LINE Yahoo
                  </span>
                  <span className="px-space-sm py-1 rounded bg-surface-container text-on-surface font-label-sm text-label-sm">
                    CyberAgent
                  </span>
                  <span className="px-space-sm py-1 rounded bg-surface-container text-on-surface font-label-sm text-label-sm">
                    SoftBank
                  </span>
                </div>
              </div>
              {/* Hero Right: Interactive Live Simulator Card */}
              <div className="lg:col-span-5 relative" id="interactive-demo">
                <div className="w-full bg-surface-container-lowest rounded-xl shadow-xl p-space-md sm:p-space-lg flex flex-col gap-space-md">
                  {/* Mock Header Bar */}
                  <div className="flex items-center justify-between bg-surface-container-low p-space-sm rounded-lg">
                    <div className="flex items-center gap-space-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse"></span>
                      <span className="font-label-md text-label-md text-primary">
                        Technical Interview Simulation
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                      <span className="inline-flex shrink-0 items-center justify-center align-middle text-[16px] text-secondary"><Icon name="mic" /></span>
                      <span>08:42 / 20:00</span>
                    </div>
                  </div>
                  {/* Chat Dialog Simulator */}
                  <div className="flex flex-col gap-space-sm">
                    {/* AI Question 1 */}
                    <div className="flex items-start gap-space-xs">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="inline-flex shrink-0 items-center justify-center align-middle text-[15px] text-on-primary"><Icon name="psychology" /></span>
                      </div>
                      <div className="flex flex-col gap-1 max-w-[88%]">
                        <div lang="ja" className="bg-surface-container-low p-space-sm rounded-lg text-primary font-body-md text-body-md">
                          「まず、自己紹介をお願いします。」
                        </div>
                        <span className="text-outline text-label-sm font-label-sm">
                          AI Lead Interviewer • Formal Japanese
                        </span>
                      </div>
                    </div>
                    {/* Student Answer */}
                    <div className="flex items-start justify-end gap-space-xs">
                      <div className="flex flex-col items-end gap-1 max-w-[88%]">
                        <div lang="ja" className="bg-secondary-fixed text-primary p-space-sm rounded-lg font-body-md text-body-md">
                          「はい。私はベトナムのVKUでコンピューターサイエンスを専攻しています。インターンではLaravelとNext.jsで決済機能を開発しました。」
                        </div>
                        <div className="flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant">
                          <span>Phạm Trung Hiếu (VKU 4th year)</span>
                          <span className="text-tertiary font-label-sm">
                            Audio In: 4.2 mora/sec
                          </span>
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center shrink-0 text-on-secondary-container text-label-sm font-label-sm">
                        VN
                      </div>
                    </div>
                    {/* Adaptive AI Follow-up (Key Value) */}
                    <div className="flex items-start gap-space-xs">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="inline-flex shrink-0 items-center justify-center align-middle text-[15px] text-on-primary"><Icon name="psychology" /></span>
                      </div>
                      <div className="flex flex-col gap-1 max-w-[90%]">
                        <div className="inline-flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm w-fit">
                          <span className="inline-flex shrink-0 items-center justify-center align-middle text-[14px] text-secondary"><Icon name="bolt" /></span>
                          <span>Adaptive Follow-up</span>
                        </div>
                        <div lang="ja" className="bg-surface-container-high p-space-sm rounded-lg text-primary font-body-md text-body-md shadow-sm">
                          「決済機能の開発で、特に苦労した
                          <span lang="ja" className="font-title text-primary underline">
                            トランザクション処理やセキュリティ対策
                          </span>
                          は何ですか？」
                        </div>
                        <p className="font-furigana text-furigana text-on-surface-variant">
                          Follow-up insight: the AI picks up on payment development and asks about transactions and security.
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Real-time Scoring Telemetry Card */}
                  <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-md flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md text-primary flex items-center gap-1">
                        <span className="inline-flex shrink-0 items-center justify-center align-middle text-[16px] text-secondary"><Icon name="insights" /></span>
                        Real-time Feedback
                      </span>
                      <span className="px-space-xs py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm">
                        Overall: 84 / 100
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-space-xs text-center">
                      <div className="bg-surface-container-low p-space-xs rounded">
                        <div className="font-label-sm text-label-sm text-on-surface-variant">
                          Japanese / Keigo
                        </div>
                        <div className="font-headline-sm text-headline-sm text-primary">
                          82
                          <span className="text-label-sm">/100</span>
                        </div>
                      </div>
                      <div className="bg-surface-container-low p-space-xs rounded">
                        <div className="font-label-sm text-label-sm text-on-surface-variant">
                          Technical Depth
                        </div>
                        <div className="font-headline-sm text-headline-sm text-primary">
                          88
                          <span className="text-label-sm">/100</span>
                        </div>
                      </div>
                      <div className="bg-surface-container-low p-space-xs rounded">
                        <div className="font-label-sm text-label-sm text-on-surface-variant">
                          Structure (PREP)
                        </div>
                        <div className="font-headline-sm text-headline-sm text-primary">
                          80
                          <span className="text-label-sm">/100</span>
                        </div>
                      </div>
                    </div>
                    {/* AI Instant Coach Tips */}
                    <div className="flex flex-wrap items-center gap-space-xs pt-1">
                      <span className="inline-flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                        <span className="inline-flex shrink-0 items-center justify-center align-middle text-[14px] text-secondary"><Icon name="check_circle" /></span>
                        Try the humble form: <span lang="ja">「専攻しております」</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                        <span className="inline-flex shrink-0 items-center justify-center align-middle text-[14px] text-secondary"><Icon name="check_circle" /></span>
                        PREP structure: clear opening point
                      </span>
                    </div>
                  </div>
                  {/* Bottom Action Simulator Dock */}
                  <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
                    <button className="flex items-center gap-1 px-space-sm py-1.5 rounded-lg bg-surface-container text-primary font-label-sm text-label-sm hover:bg-surface-container-high transition-colors">
                      <span className="inline-flex shrink-0 items-center justify-center align-middle text-[16px]"><Icon name="volume_up" /></span>
                      <span>Replay Question</span>
                    </button>
                    <div className="flex items-center gap-space-xs">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
                        <span className="inline-flex shrink-0 items-center justify-center align-middle text-[18px]"><Icon name="mic" /></span>
                      </div>
                      <span className="font-label-sm text-label-sm text-secondary animate-pulse">
                        Listening...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* Metric Badges Strip */}
          <section className="w-full bg-surface-container-lowest py-space-lg px-margin shadow-sm">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-gutter text-center">
              <div className="flex flex-col items-center gap-1">
                <span className="font-display text-display text-primary">
                  91.4%
                </span>
                <span className="font-title text-title text-on-surface">
                  First-Round Pass Rate
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Among Vietnamese users interviewing at Japanese tech firms
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="font-display text-display text-primary">
                  12,500+
                </span>
                <span className="font-title text-title text-on-surface">
                  Interview Questions
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Web, backend, cloud, and AI roles
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="font-display text-display text-primary">
                  1.2 sec
                </span>
                <span className="font-title text-title text-on-surface">
                  Real-time Voice Response
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Natural pacing with responsive follow-up questions
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="font-display text-display text-primary">
                  N3–N1
                </span>
                <span className="font-title text-title text-on-surface">
                  JLPT-Aligned Practice
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Reading aids and Vietnamese notes tailored to your level
                </span>
              </div>
            </div>
          </section>
          {/* 3 Simple Steps */}
          <section className="w-full bg-surface py-space-xl px-margin">
            <div className="max-w-7xl mx-auto flex flex-col gap-space-xl">
              <div className="text-center max-w-3xl mx-auto flex flex-col gap-space-xs">
                <span className="font-label-lg text-label-lg text-secondary uppercase tracking-wider">
                  How It Works
                </span>
                <h2 className="font-headline-lg text-headline-lg text-primary">
                  Get interview-ready in three simple steps
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Upload your resume and start practicing with personalized questions based on your technical experience.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                {/* Step 1 Card */}
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md relative">
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-full bg-primary text-on-primary font-headline-sm text-headline-sm flex items-center justify-center">
                      1
                    </span>
                    <span className="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                      STEP 01
                    </span>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <h3 className="font-headline-sm text-headline-sm text-primary">
                      Upload Your Resume &amp; Job Description
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Upload a resume in Vietnamese, English, or Japanese, or add your target job description. The AI identifies your tech stack, from Laravel and Spring to AWS.
                    </p>
                  </div>
                  <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col gap-space-xs">
                    <div className="flex items-center gap-space-xs text-primary font-label-sm text-label-sm">
                      <span className="inline-flex shrink-0 items-center justify-center align-middle text-[16px] text-secondary"><Icon name="description" /></span>
                      <span>Resume_PhamTrungHieu_VKU.pdf</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-space-xs py-0.5 bg-surface-container-highest rounded text-label-sm font-label-sm text-primary">
                        Vue.js / React
                      </span>
                      <span className="px-space-xs py-0.5 bg-surface-container-highest rounded text-label-sm font-label-sm text-primary">
                        Go / Gin
                      </span>
                      <span className="px-space-xs py-0.5 bg-surface-container-highest rounded text-label-sm font-label-sm text-primary">
                        MySQL Sharding
                      </span>
                    </div>
                  </div>
                </div>
                {/* Step 2 Card */}
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md relative">
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-full bg-secondary text-on-secondary font-headline-sm text-headline-sm flex items-center justify-center">
                      2
                    </span>
                    <span className="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                      STEP 02
                    </span>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <h3 className="font-headline-sm text-headline-sm text-primary">
                      Practice a Realistic Voice Interview
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Go beyond fixed scripts. The AI follows your answers with questions about database design, technical decisions, and why you chose the company.
                    </p>
                  </div>
                  <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
                      <span>Interviewer Persona</span>
                      <span className="text-primary font-label-sm">
                        Tech Lead (late 30s)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-secondary w-3/4 rounded-full"></div>
                    </div>
                    <span className="text-label-sm font-label-sm text-secondary">
                      Question depth: Level 4 — Architecture &amp; Incident Response
                    </span>
                  </div>
                </div>
                {/* Step 3 Card */}
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md relative">
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-full bg-tertiary-container text-tertiary-fixed font-headline-sm text-headline-sm flex items-center justify-center">
                      3
                    </span>
                    <span className="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                      STEP 03
                    </span>
                  </div>
                  <div className="flex flex-col gap-space-xs">
                    <h3 className="font-headline-sm text-headline-sm text-primary">
                      Improve with Keigo Feedback &amp; Model Answers
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Review detailed feedback on grammar, formality, and PREP structure after each session, with model answers and Vietnamese translations.
                    </p>
                  </div>
                  <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between text-label-sm font-label-sm">
                      <span lang="ja" className="text-error flex items-center gap-1">
                        <span className="inline-flex shrink-0 items-center justify-center align-middle text-[14px]"><Icon name="close" /></span>
                        「〜を作ったことがあります」
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-label-sm font-label-sm">
                      <span lang="ja" className="text-tertiary flex items-center gap-1">
                        <span className="inline-flex shrink-0 items-center justify-center align-middle text-[14px]"><Icon name="check" /></span>
                        「〜の開発に従事いたしました」
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* Core Features Bento Grid (5 Reasons) */}
          <section className="w-full bg-surface-container-low py-space-xl px-margin">
            <div className="max-w-7xl mx-auto flex flex-col gap-space-xl">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
                <div className="flex flex-col gap-space-xs max-w-2xl">
                  <span className="font-label-lg text-label-lg text-secondary uppercase tracking-wider">
                    Features & Advantages
                  </span>
                  <h2 className="font-headline-lg text-headline-lg text-primary">
                    Five reasons to practice with Aizuchi.AI
                  </h2>
                  <p className="font-body-lg text-body-lg text-on-surface-variant">
                    Built around Japanese hiring expectations and the language challenges Vietnamese students face, with feedback that goes beyond a generic chatbot.
                  </p>
                </div>
                <a
                  className="inline-flex items-center gap-1 text-primary font-label-lg text-label-lg hover:text-secondary transition-colors"
                  data-path="all-features"
                  href="#"
                >
                  <span>Explore All Features</span>
                  <span className="inline-flex shrink-0 items-center justify-center align-middle text-[18px]"><Icon name="arrow_forward" /></span>
                </a>
              </div>
              {/* Bento Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
                {/* Bento 1: Personalized (Span 7) */}
                <div className="md:col-span-7 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md">
                  <div className="flex flex-col gap-space-xs">
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="inline-flex shrink-0 items-center justify-center align-middle text-[24px]"><Icon name="manage_accounts" /></span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-primary">
                      1. Personalized Interviews
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      The AI compares your resume with the job description to ask about your actual experience, from offshore teamwork to AWS cost optimization.
                    </p>
                  </div>
                  {/* Visual Data Mock */}
                  <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
                      <span>
                        Matching Matrix: Candidate Profile vs. Mercari Backend
                        Engineer JD
                      </span>
                      <span className="text-secondary font-label-md">
                        Match Score 94%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-space-xs pt-1">
                      <div className="p-space-xs bg-surface-container-lowest rounded text-center">
                        <span className="block font-label-sm text-label-sm text-on-surface-variant">
                          Go / Microservices
                        </span>
                        <span className="font-headline-sm text-headline-sm text-primary">
                          In-depth Follow-up
                        </span>
                      </div>
                      <div className="p-space-xs bg-surface-container-lowest rounded text-center">
                        <span className="block font-label-sm text-label-sm text-on-surface-variant">
                          GCP / PubSub
                        </span>
                        <span className="font-headline-sm text-headline-sm text-primary">
                          System Design
                        </span>
                      </div>
                      <div className="p-space-xs bg-surface-container-lowest rounded text-center">
                        <span className="block font-label-sm text-label-sm text-on-surface-variant">
                          English / Japanese Collaboration
                        </span>
                        <span className="font-headline-sm text-headline-sm text-primary">
                          Culture Fit
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Bento 2: Adaptive Branching (Span 5) */}
                <div className="md:col-span-5 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md">
                  <div className="flex flex-col gap-space-xs">
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="inline-flex shrink-0 items-center justify-center align-middle text-[24px]"><Icon name="account_tree" /></span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-primary">
                      2. Adaptive Follow-up Questions
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Japanese interviewers want to understand why you made a decision. Practice explaining your reasoning through connected follow-up questions.
                    </p>
                  </div>
                  {/* Branching Flow Graphic */}
                  <div className="flex flex-col gap-2 bg-surface-container-low p-space-sm rounded-lg font-label-sm text-label-sm">
                    <div className="flex items-center gap-2 text-primary">
                      <span className="w-2 h-2 rounded-full bg-secondary"></span>
                      <span>“I used Redis for caching.”</span>
                    </div>
                    <div className="pl-4 border-l-2 border-outline-variant flex flex-col gap-1">
                      <span className="text-on-surface-variant">
                        AI follow-up: “How did you prevent cache stampedes?”
                      </span>
                      <span className="text-on-surface-variant">
                        AI follow-up: “How did you choose the TTL?”
                      </span>
                    </div>
                  </div>
                </div>
                {/* Bento 3: Keigo & Particle Polish (Span 4) */}
                <div className="md:col-span-4 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md">
                  <div className="flex flex-col gap-space-xs">
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="inline-flex shrink-0 items-center justify-center align-middle text-[24px]"><Icon name="spellcheck" /></span>
                    </div>
                    <h3 className="font-title text-title text-primary">
                      3. Japanese &amp; Keigo Feedback
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Spot common particle mistakes and learn when to use polite, humble, and honorific language in a Japanese interview.
                    </p>
                  </div>
                  <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col gap-1 text-label-sm font-label-sm">
                    <div lang="ja" className="text-error line-through">
                      御社のプロダクトを見ました
                    </div>
                    <div lang="ja" className="text-primary font-title">
                      貴社プロダクトを拝見いたしました
                    </div>
                    <span className="text-outline text-furigana font-furigana">
                      Keigo tip: use respectful phrasing when referring to the company you are applying to.
                    </span>
                  </div>
                </div>
                {/* Bento 4: Speech Rate & Acoustics (Span 4) */}
                <div className="md:col-span-4 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md">
                  <div className="flex flex-col gap-space-xs">
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="inline-flex shrink-0 items-center justify-center align-middle text-[24px]"><Icon name="graphic_eq" /></span>
                    </div>
                    <h3 className="font-title text-title text-primary">
                      4. Voice Interviews &amp; Speech Analysis
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Identify rushed speech and long pauses. Visual guidance helps you maintain a natural pace of 300–350 mora per minute.
                    </p>
                  </div>
                  {/* Waveform Visual */}
                  <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-1 h-8">
                      <span className="w-1 bg-secondary h-3 rounded-full"></span>
                      <span className="w-1 bg-secondary h-6 rounded-full"></span>
                      <span className="w-1 bg-primary h-8 rounded-full"></span>
                      <span className="w-1 bg-primary h-5 rounded-full"></span>
                      <span className="w-1 bg-secondary h-7 rounded-full"></span>
                      <span className="w-1 bg-secondary h-4 rounded-full"></span>
                      <span className="w-1 bg-primary h-6 rounded-full"></span>
                      <span className="w-1 bg-primary h-3 rounded-full"></span>
                    </div>
                    <div className="text-right">
                      <span className="font-headline-sm text-headline-sm text-primary block">
                        320
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        mora / min (ideal)
                      </span>
                    </div>
                  </div>
                </div>
                {/* Bento 5: Progress & Benchmark (Span 4) */}
                <div className="md:col-span-4 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md">
                  <div className="flex flex-col gap-space-xs">
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="inline-flex shrink-0 items-center justify-center align-middle text-[24px]"><Icon name="troubleshoot" /></span>
                    </div>
                    <h3 className="font-title text-title text-primary">
                      5. Interview Readiness Benchmark
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Review your logical reasoning, technical depth, culture fit, and Japanese proficiency against first-round interview expectations, with JLPT-aligned feedback.
                    </p>
                  </div>
                  {/* Progress Visual */}
                  <div className="bg-surface-container-low p-space-sm rounded-lg flex flex-col gap-1">
                    <div className="flex items-center justify-between text-label-sm font-label-sm">
                      <span className="text-primary font-label-md">
                        Estimated First-Round Pass Rate
                      </span>
                      <span className="text-primary font-headline-sm text-headline-sm">
                        88.5%
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[88.5%] rounded-full"></div>
                    </div>
                    <span className="font-label-sm text-label-sm text-tertiary">
                      Ready for interviews at Japanese web product companies
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* Bilingual Vietnamese Bridge Section */}
          <section className="w-full bg-surface py-space-xl px-margin">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
              <div className="lg:col-span-6 flex flex-col gap-space-md">
                <div className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm w-fit">
                  <span className="inline-flex shrink-0 items-center justify-center align-middle text-[16px] text-secondary"><Icon name="translate" /></span>
                  <span>Built for Vietnamese Engineers &amp; Students</span>
                </div>
                <h2 className="font-headline-lg text-headline-lg text-primary">
                  Express your technical expertise confidently in Japanese
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Strong technical skills deserve clear answers. Explore interview intent and model responses with Vietnamese language support, so you can explain what you know with confidence.
                </p>
                <div className="flex flex-col gap-space-sm pt-space-xs">
                  <div className="flex items-start gap-space-xs">
                    <span className="inline-flex shrink-0 items-center justify-center align-middle text-secondary text-[20px] mt-0.5"><Icon name="check_circle" /></span>
                    <div className="flex flex-col">
                      <span className="font-title text-title text-primary">
                        Understand the question and the interviewer’s intent
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Know whether a question calls for system architecture knowledge or a demonstration of problem-solving skills.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-space-xs">
                    <span className="inline-flex shrink-0 items-center justify-center align-middle text-secondary text-[20px] mt-0.5"><Icon name="check_circle" /></span>
                    <div className="flex flex-col">
                      <span className="font-title text-title text-primary">
                        Build clear answers with the PREP framework
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Point → Reason → Example from a real project → Point connecting your skills to the role.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-space-xs">
                    <span className="inline-flex shrink-0 items-center justify-center align-middle text-secondary text-[20px] mt-0.5"><Icon name="check_circle" /></span>
                    <div className="flex flex-col">
                      <span className="font-title text-title text-primary">
                        Furigana support for technical terms and kanji
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Learn to pronounce technical terms for redundancy, load balancing, authentication, and maintenance.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Bilingual Demo Visual Card */}
              <div className="lg:col-span-6 bg-surface-container-lowest p-space-lg rounded-xl shadow-md flex flex-col gap-space-md">
                <div className="flex items-center justify-between pb-space-xs">
                  <span className="font-title text-title text-primary">
                    Bilingual Interview Assistant View
                  </span>
                  <span className="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                    JLPT N2 Mode
                  </span>
                </div>
                {/* Question with Furigana & Intent Card */}
                <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-xs">
                  <span className="text-label-sm font-label-sm text-secondary font-semibold">
                    Q3. System Design &amp; Teamwork
                  </span>
                  <p lang="ja" className="font-body-lg text-body-lg text-primary">
                    「マイクロサービス化において、サービス間の
                    <ruby>
                      整合性
                      <rt className="font-furigana text-furigana">
                        せいごうせい
                      </rt>
                    </ruby>
                    と
                    <ruby>
                      障害分離
                      <rt className="font-furigana text-furigana">
                        しょうがいぶんり
                      </rt>
                    </ruby>
                    をどのように担保しましたか？」
                  </p>
                  <div className="p-space-xs bg-surface-container rounded text-label-sm font-label-sm text-on-surface-variant flex flex-col gap-1">
                    <span className="font-semibold text-primary">
                      Question intent:
                    </span>
                    <span>
                      The interviewer is assessing your understanding of the Saga pattern, eventual consistency, and circuit breakers for preventing cascading failures between services.
                    </span>
                  </div>
                </div>
                {/* Audio Practice with Audio Visualizer */}
                <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-primary">
                      Your Recorded Answer
                    </span>
                    <span className="text-label-sm font-label-sm text-tertiary">
                      Speech analysis: Good (42 sec)
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs py-space-xs">
                    <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center">
                      <span className="inline-flex shrink-0 items-center justify-center align-middle text-[18px]"><Icon name="play_arrow" /></span>
                    </div>
                    <div className="flex-1 h-3 bg-surface-container-high rounded-full overflow-hidden flex items-center px-1">
                      <div className="w-2/3 h-1.5 bg-secondary rounded-full"></div>
                    </div>
                    <span className="text-label-sm font-label-sm text-on-surface-variant">
                      00:42
                    </span>
                  </div>
                  <div className="text-label-sm font-label-sm text-on-surface-variant">
                    “We adopted an event-driven architecture and maintained eventual consistency through Apache Kafka...”
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* Target Users & Success Stories */}
          <section className="w-full bg-surface-container-low py-space-xl px-margin">
            <div className="max-w-7xl mx-auto flex flex-col gap-space-xl">
              <div className="text-center max-w-3xl mx-auto flex flex-col gap-space-xs">
                <span className="font-label-lg text-label-lg text-secondary uppercase tracking-wider">
                  Success Stories
                </span>
                <h2 className="font-headline-lg text-headline-lg text-primary">
                  From Vietnamese universities to Japanese tech careers
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Students from VKU, HUST, and VNU-UET used Aizuchi.AI to prepare for their next career step.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                {/* Story 1: VKU Student */}
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md">
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex flex-wrap items-center gap-space-sm">
                      <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm">
                        TH
                      </div>
                      <div className="flex flex-col">
                        <span className="font-title text-title text-primary">
                          Trần Hoàng Nam
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          VKU (Da Nang) • Computer Engineering
                        </span>
                        <span className="text-label-sm font-label-sm text-tertiary">
                          JLPT N2 Certified
                        </span>
                      </div>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      “I studied Spring Boot and cloud infrastructure at university, but I was unsure how to ask the interviewer questions or discuss setbacks. After 15 mock interviews with Aizuchi.AI, I could confidently explain my technical decisions.”
                    </p>
                  </div>
                  <div className="pt-space-xs border-t border-surface-container flex items-center justify-between">
                    <span className="text-label-sm font-label-sm text-on-surface-variant">
                      Offer Received
                    </span>
                    <span className="font-title text-title text-primary">
                      Rakuten Symphony (Backend)
                    </span>
                  </div>
                </div>
                {/* Story 2: HUST Student */}
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md">
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex flex-wrap items-center gap-space-sm">
                      <div className="w-12 h-12 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-headline-sm text-headline-sm">
                        LM
                      </div>
                      <div className="flex flex-col">
                        <span className="font-title text-title text-primary">
                          Lê Thị Mai
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          HUST (Hanoi) • Information Systems
                        </span>
                        <span className="text-label-sm font-label-sm text-tertiary">
                          JLPT N1 Certified
                        </span>
                      </div>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      “I could hold everyday conversations, but I struggled with honorific and humble language in interviews. Real-time feedback on my spoken Japanese helped me catch mistakes and speak with more confidence.”
                    </p>
                  </div>
                  <div className="pt-space-xs border-t border-surface-container flex items-center justify-between">
                    <span className="text-label-sm font-label-sm text-on-surface-variant">
                      Offer Received
                    </span>
                    <span className="font-title text-title text-primary">
                      LINE Yahoo (Frontend Engineer)
                    </span>
                  </div>
                </div>
                {/* Story 3: VNU-HCM Student */}
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col justify-between gap-space-md">
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex flex-wrap items-center gap-space-sm">
                      <div className="w-12 h-12 rounded-full bg-tertiary-container text-tertiary-fixed flex items-center justify-center font-headline-sm text-headline-sm">
                        NV
                      </div>
                      <div className="flex flex-col">
                        <span className="font-title text-title text-primary">
                          Nguyễn Văn Tuấn
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          VNU-HCM • Software Engineering
                        </span>
                        <span className="text-label-sm font-label-sm text-tertiary">
                          JLPT N3 at Interview
                        </span>
                      </div>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      “At N3 level, Japanese interviews felt intimidating. Furigana and Vietnamese notes helped me understand the questions and learn to answer clearly using the PREP framework.”
                    </p>
                  </div>
                  <div className="pt-space-xs border-t border-surface-container flex items-center justify-between">
                    <span className="text-label-sm font-label-sm text-on-surface-variant">
                      Offer Received
                    </span>
                    <span className="font-title text-title text-primary">
                      Japanese Software &amp; SaaS Company (Tokyo)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* Interactive Question Practice Preview */}
          <section className="w-full bg-surface py-space-xl px-margin">
            <div className="max-w-7xl mx-auto flex flex-col gap-space-lg">
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-lg text-label-lg text-secondary uppercase tracking-wider">
                  Practice Question Bank
                </span>
                <h2 className="font-headline-lg text-headline-lg text-primary">
                  Explore common Japanese tech interview questions
                </h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Browse categories and preview the follow-up questions and feedback you can practice with.
                </p>
              </div>
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-space-xs">
                <button className="px-space-md py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md">
                  All
                </button>
                <button className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">
                  Introduction &amp; Motivation
                </button>
                <button className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">
                  Technology &amp; Architecture
                </button>
                <button className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">
                  Teamwork &amp; Problem Solving
                </button>
                <button className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors">
                  Questions for the Interviewer
                </button>
              </div>
              {/* Question Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                {/* Question Item 1 */}
                <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between gap-space-sm">
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-space-xs py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm">
                        Technical Deep Dive
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Frequency: ★★★★★
                      </span>
                    </div>
                    <h3 className="font-title text-title text-primary">
                      “Which change had the biggest impact on performance in your project, and what were the measurable results?”
                    </h3>
                    <p className="font-furigana text-furigana text-on-surface-variant">
                      Tip: quantify your impact, such as reducing query time from 3 seconds to 200 ms with indexing and caching.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
                    <span className="font-label-sm text-label-sm text-secondary">
                      Suggested structure: PREP + Before/After Metrics
                    </span>
                    <button className="flex items-center gap-1 font-label-md text-label-md text-primary hover:text-secondary transition-colors">
                      <span>Practice This Question</span>
                      <span className="inline-flex shrink-0 items-center justify-center align-middle text-[16px]"><Icon name="chevron_right" /></span>
                    </button>
                  </div>
                </div>
                {/* Question Item 2 */}
                <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between gap-space-sm">
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-space-xs py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm">
                        Culture &amp; Working in Japan
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Frequency: ★★★★★
                      </span>
                    </div>
                    <h3 className="font-title text-title text-primary">
                      “Why do you want to start your engineering career in Japan rather than in Vietnam?”
                    </h3>
                    <p className="font-furigana text-furigana text-on-surface-variant">
                      Tip: connect your answer to large-scale systems, continuous improvement, or products with a wide user base.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
                    <span className="font-label-sm text-label-sm text-secondary">
                      Suggested structure: Industry Comparison + Career Goals
                    </span>
                    <button className="flex items-center gap-1 font-label-md text-label-md text-primary hover:text-secondary transition-colors">
                      <span>Practice This Question</span>
                      <span className="inline-flex shrink-0 items-center justify-center align-middle text-[16px]"><Icon name="chevron_right" /></span>
                    </button>
                  </div>
                </div>
                {/* Question Item 3 */}
                <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between gap-space-sm">
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-space-xs py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm">
                        Teamwork
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Frequency: ★★★★☆
                      </span>
                    </div>
                    <h3 className="font-title text-title text-primary">
                      “How did you reach a consensus when your team disagreed on a technical decision?”
                    </h3>
                    <p className="font-furigana text-furigana text-on-surface-variant">
                      Tip: show how you listened and used a proof of concept or benchmark data to resolve the disagreement.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
                    <span className="font-label-sm text-label-sm text-secondary">
                      Suggested structure: Situation → Action → Result
                    </span>
                    <button className="flex items-center gap-1 font-label-md text-label-md text-primary hover:text-secondary transition-colors">
                      <span>Practice This Question</span>
                      <span className="inline-flex shrink-0 items-center justify-center align-middle text-[16px]"><Icon name="chevron_right" /></span>
                    </button>
                  </div>
                </div>
                {/* Question Item 4 */}
                <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between gap-space-sm">
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <span className="px-space-xs py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm">
                        Questions for the Interviewer
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Frequency: ★★★★★
                      </span>
                    </div>
                    <h3 className="font-title text-title text-primary">
                      “Do you have any questions for us?” Prepare thoughtful questions to close your interview.
                    </h3>
                    <p className="font-furigana text-furigana text-on-surface-variant">
                      Tip: show that you have researched the engineering team, tech stack, and onboarding process.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
                    <span className="font-label-sm text-label-sm text-secondary">
                      Suggested structure: Company Research + Team Decisions
                    </span>
                    <button className="flex items-center gap-1 font-label-md text-label-md text-primary hover:text-secondary transition-colors">
                      <span>Practice This Question</span>
                      <span className="inline-flex shrink-0 items-center justify-center align-middle text-[16px]"><Icon name="chevron_right" /></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* Final Call to Action Banner */}
          <section className="w-full bg-primary text-on-primary py-space-xl px-margin relative overflow-hidden">
            {/* Subtle Ambient Glow */}
            <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-secondary opacity-20 blur-3xl pointer-events-none"></div>
            <div className="absolute -left-20 -bottom-20 w-96 h-96 rounded-full bg-tertiary-container opacity-30 blur-3xl pointer-events-none"></div>
            <div className="max-w-5xl mx-auto flex flex-col items-center text-center gap-space-md relative z-10">
              <span className="px-space-sm py-1 rounded-full bg-primary-container text-secondary-fixed text-label-sm font-label-sm">
                Start your journey toward a tech career in Japan
              </span>
              <h2 className="font-display text-display text-on-primary tracking-tight">
                Build the confidence to land your next role in Japan.
              </h2>
              <p className="font-body-lg text-body-lg text-surface-container max-w-2xl">
                Sign up in 30 seconds. No credit card required.
                <br className="hidden sm:inline" />
                Try a full voice interview and receive a Japanese language feedback report after signing up.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-space-sm pt-space-xs w-full sm:w-auto">
                <a
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-xl py-3.5 rounded-lg bg-surface-container-lowest text-primary font-label-lg text-label-lg shadow-lg hover:bg-surface-container-low transition-all"
                  data-path="signup-free"
                  href="#"
                >
                  <span>Start a Free Mock Interview</span>
                  <span className="inline-flex shrink-0 items-center justify-center align-middle text-[20px]"><Icon name="arrow_forward" /></span>
                </a>
                <a
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-lg py-3.5 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-surface-container-high/20 transition-colors"
                  data-path="schedule-demo"
                  href="#"
                >
                  <span className="inline-flex shrink-0 items-center justify-center align-middle text-[20px]"><Icon name="help" /></span>
                  <span>Talk to Us for Your University</span>
                </a>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-space-md pt-space-xs text-label-sm font-label-sm text-surface-container-high">
                <span className="flex items-center gap-1">
                  <span className="inline-flex shrink-0 items-center justify-center align-middle text-[16px] text-tertiary-fixed"><Icon name="check_circle" /></span>
                  No credit card required
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex shrink-0 items-center justify-center align-middle text-[16px] text-tertiary-fixed"><Icon name="check_circle" /></span>
                  Instant Resume PDF Analysis
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-flex shrink-0 items-center justify-center align-middle text-[16px] text-tertiary-fixed"><Icon name="check_circle" /></span>
                  Voice Practice on Mobile &amp; Desktop
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>
      <footer className="w-full bg-surface-container-lowest shadow-[0_-1px_6px_rgba(4,21,52,0.03)]">
        <div className="w-full px-margin py-space-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter">
            <div className="lg:col-span-2 flex flex-col gap-space-md">
              <div className="flex flex-wrap items-center gap-space-sm">
                <Image
                  src="/logo.svg"
                  alt="Aizuchi.AI — AI Japanese Interview Trainer"
                  width={160}
                  height={40}
                  className="h-10 w-40"
                />
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                AI interview coaching for Vietnamese engineers and students targeting Japanese tech companies such as Rakuten, LINE Yahoo, Mercari, and CyberAgent. Practice with Japanese language feedback, structured answers, and speech analysis.
              </p>
              <div className="flex flex-wrap items-center gap-space-sm">
                <span className="px-space-sm py-0.5 rounded-lg bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                  JLPT N1 / N2 Support
                </span>
                <span className="px-space-sm py-0.5 rounded-lg bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                  Keigo Feedback
                </span>
                <span className="px-space-sm py-0.5 rounded-lg bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                  Vietnamese Translations
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-space-sm">
              <h3 className="font-title text-title text-primary">
                Product
              </h3>
              <ul className="flex flex-col gap-space-xs font-body-md text-body-md text-on-surface-variant">
                <li className="hover:text-primary transition-colors cursor-pointer">
                  Mock Interview Room
                </li>
                <li className="hover:text-primary transition-colors cursor-pointer">
                  Real-time Keigo Feedback
                </li>
                <li className="hover:text-primary transition-colors cursor-pointer">
                  JLPT N1 / N2 Vocabulary
                </li>
                <li className="hover:text-primary transition-colors cursor-pointer">
                  Interviewer Questions &amp; Company Research
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-space-sm">
              <h3 className="font-title text-title text-primary">
                Resources
              </h3>
              <ul className="flex flex-col gap-space-xs font-body-md text-body-md text-on-surface-variant">
                <li className="hover:text-primary transition-colors cursor-pointer">
                  Japanese Tech Interview Guide
                </li>
                <li className="hover:text-primary transition-colors cursor-pointer">
                  Build Better Answers with PREP
                </li>
                <li className="hover:text-primary transition-colors cursor-pointer">
                  Resume &amp; Work History Review
                </li>
                <li className="hover:text-primary transition-colors cursor-pointer">
                  Vietnamese Engineers’ Career Stories
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-space-sm">
              <h3 className="font-title text-title text-primary">Company</h3>
              <ul className="flex flex-col gap-space-xs font-body-md text-body-md text-on-surface-variant">
                <li className="hover:text-primary transition-colors cursor-pointer">
                  About Us
                </li>
                <li className="hover:text-primary transition-colors cursor-pointer">
                  Contact
                </li>
                <li className="hover:text-primary transition-colors cursor-pointer">
                  Privacy Policy
                </li>
                <li className="hover:text-primary transition-colors cursor-pointer">
                  Terms of Service
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-space-xl pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-sm text-on-surface-variant font-label-sm text-label-sm">
            <span>© 2025 Aizuchi.AI Inc. All rights reserved.</span>
            <span>Empowering Vietnamese Tech Leaders in Japan.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
