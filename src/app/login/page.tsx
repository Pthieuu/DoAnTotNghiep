"use client";

import Link from "next/link";
import Icon from "@/components/icon";
import { useState } from "react";

const highlights = [
  { icon: "psychology", title: "AI Adaptive Simulation", badge: "CV×求人票", detail: "職務経歴書と志望企業のJDに基づいた本番同様の深掘り質問" },
  { icon: "groups", title: "Real-time Voice Keigo", badge: "講評・敬語指導", detail: "音声解析による発話スピード（mora/s）と敬語運用を即時修正" },
  { icon: "fact_check", title: "Enterprise Benchmarking", badge: "日本基準", detail: "メガベンチャー・大手SIerの採用水準と合格率を予測判定" },
] as const;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");

  function showMockNotice() {
    setNotice("Đây là màn hình mock. Chức năng đăng nhập chưa được kết nối.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4 py-10 sm:px-8 sm:py-16">
      <div className="grid w-full max-w-[1140px] overflow-hidden rounded-lg bg-white shadow-[0_16px_28px_-12px_rgba(15,23,42,0.28)] md:grid-cols-[5fr_7fr]">
        <aside className="flex flex-col bg-[linear-gradient(115deg,#14294b_0%,#061432_55%,#122749_100%)] p-7 text-white sm:p-10">
          <Link href="/" className="mb-5 flex w-fit items-center gap-2.5" aria-label="Aizuchi.AI — Trang chủ">
            <svg aria-hidden="true" viewBox="0 0 36 40" fill="none" className="h-10 w-9 shrink-0">
              <rect x="2" y="4" width="32" height="32" rx="8" fill="#1b2a4a" />
              <path d="M10 24L18 10L26 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 19.5H23" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="25" cy="12" r="3.5" fill="#ef4444" />
              <path d="M22 27C24.5 29 27.5 29 30 27" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>
              <span className="block text-xl font-semibold tracking-tight">Aizuchi.AI</span>
              <span className="block text-[10px] tracking-wider text-slate-400">AI日本面接トレーナー</span>
            </span>
          </Link>

          <span className="mb-6 w-fit rounded-full bg-white/5 px-2 py-1 text-[10px] tracking-wider text-teal-200">
            <span className="mr-1 inline-block size-1.5 rounded-full bg-teal-300" />
            VKU &amp; VN Engineers Career Fast-Track
          </span>
          <h1 lang="ja" className="text-[28px] leading-snug font-bold tracking-tight lg:text-[32px]">
            日本のIT企業内定への<br />
            <span className="text-blue-200">最短ルート</span>を切り拓く。
          </h1>
          <p lang="ja" className="mt-3 text-[13px] leading-relaxed text-slate-400">
            VN IT人材専用のAI面接シミュレーター。敬語の誤り、助詞の脱落、論理構成を即時スコアリング。
          </p>

          <div className="my-6 space-y-3">
            {highlights.map((item, index) => (
              <div key={item.title} className="flex items-start gap-3 rounded-sm bg-white/5 p-2.5">
                <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center align-middle rounded-sm p-1.5 text-[22px] ${index === 1 ? "bg-teal-900/50 text-teal-300" : "bg-blue-300/25 text-blue-200"}`}><Icon name={item.icon} /></span>
                <div>
                  <h2 className="text-sm leading-6 font-semibold text-slate-200">
                    {item.title}{" "}
                    <span className={`whitespace-nowrap rounded-sm px-1 py-0.5 text-[9px] font-medium ${index === 1 ? "bg-teal-900/50 text-teal-200" : "bg-blue-300/20 text-blue-200"}`}>{item.badge}</span>
                  </h2>
                  <p lang="ja" className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <figure className="mt-auto rounded-sm bg-white/5 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span aria-label="5 out of 5 stars" className="text-sm tracking-[3px] text-blue-200">★★★★★</span>
              <span className="rounded-sm bg-teal-950 px-2 py-0.5 text-[10px] text-teal-200">内定実績</span>
            </div>
            <blockquote className="text-xs leading-relaxed italic text-slate-200">
              &ldquo;Aizuchi.AI helped me pass Rakuten &amp; LINE Yahoo technical interviews with complete confidence!&rdquo;
            </blockquote>
            <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="flex size-6 items-center justify-center rounded-full bg-blue-200 text-sm font-bold text-primary">H</span>Phạm Trung Hiếu</span>
              <span className="text-[10px] tracking-wide text-slate-400">VKU IT • JLPT N2</span>
            </figcaption>
          </figure>
        </aside>

        <section aria-labelledby="login-heading" className="flex flex-col p-7 sm:p-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-on-surface-variant">
              <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center align-middle text-[14px] text-secondary"><Icon name="verified_user" /></span>
              Enterprise SSL Secured
            </span>
            <div aria-label="Ngôn ngữ giao diện (mock)" className="flex gap-1 rounded-full bg-surface-container-high p-1">
              {["日本語", "Tiếng Việt", "EN"].map((language, index) => (
                <button key={language} type="button" aria-pressed={index === 0} onClick={showMockNotice} className={`rounded-full px-2 py-0.5 ${index === 0 ? "bg-white font-semibold text-primary shadow-sm" : "text-on-surface-variant"}`}>{language}</button>
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-[440px]">
            <h2 id="login-heading" className="text-2xl font-bold text-primary">ログイン</h2>
            <p className="mt-2 text-[13px] text-on-surface-variant">Enter your credentials to access your interview workspace.</p>

            <div className="mt-5 rounded-sm bg-surface-container-low p-2">
              <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-semibold text-primary">
                <span className="flex items-center gap-1"><span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center align-middle text-[14px] text-secondary"><Icon name="bolt" /></span>デモアカウントですぐ試す (Quick Demo):</span>
                <span className="shrink-0 bg-blue-100 px-1.5">1-Click</span>
              </div>
              <Link href="/dashboard" className="flex w-full items-center gap-1.5 bg-white px-2 py-2.5 text-left text-[11px] font-medium text-primary">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold">P</span>
                <span>Try as Phạm Trung Hiếu (VKU • JLPT N2)</span>
                <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center align-middle ml-auto text-[18px] text-secondary"><Icon name="arrow_forward" /></span>
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={showMockNotice} className="flex items-center justify-center gap-1.5 rounded-sm bg-surface-container py-2 text-xs font-medium">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0">
                  <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.61 0-4.83-1.76-5.62-4.13H3.04v2.59A10 10 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.38 13.92a6 6 0 0 1 0-3.84V7.49H3.04a10 10 0 0 0 0 9.02l3.34-2.59Z" />
                  <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.96 5.49l3.34 2.59A5.98 5.98 0 0 1 12 5.95Z" />
                </svg>Google
              </button>
              <button type="button" onClick={showMockNotice} className="flex items-center justify-center gap-1.5 rounded-sm bg-surface-container py-2 text-xs font-medium">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-3.5"><path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.64 1.22 3.28.93.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.63 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.64 5.28-5.15 5.56.4.35.76 1.03.76 2.08v3.09c0 .3.2.65.77.54A11.25 11.25 0 0 0 12 .75Z" /></svg>GitHub
              </button>
            </div>

            <div className="my-4 flex items-center gap-3 text-[10px] text-on-surface-variant"><span className="h-px flex-1 bg-surface-container" />またはメールアドレスでログイン<span className="h-px flex-1 bg-surface-container" /></div>

            <form onSubmit={(event) => { event.preventDefault(); showMockNotice(); }} className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px]"><label htmlFor="email" className="text-primary">メールアドレス (Email)</label><span className="text-[10px] text-on-surface-variant">VKU / Đại học / Work</span></div>
                <div className="relative">
                  <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center align-middle pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-outline"><Icon name="mail" /></span>
                  <input id="email" name="email" type="email" autoComplete="email" placeholder="hieu.pham@vku.udn.vn" required className="w-full rounded-sm bg-surface-container-low py-3 pr-3 pl-10 text-[13px] outline-offset-2 placeholder:text-outline focus:outline-2 focus:outline-secondary" />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px]"><label htmlFor="password" className="text-primary">パスワード (Password)</label><button type="button" onClick={showMockNotice} className="text-[10px] text-secondary hover:underline">パスワードをお忘れですか？</button></div>
                <div className="relative">
                  <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center align-middle pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-outline"><Icon name="lock" /></span>
                  <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••••••" required className="w-full rounded-sm bg-surface-container-low py-3 pr-11 pl-10 text-[13px] outline-offset-2 placeholder:text-outline focus:outline-2 focus:outline-secondary" />
                  <button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center text-outline"><span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center align-middle text-[18px]"><Icon name={showPassword ? "visibility_off" : "visibility"} /></span></button>
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-on-surface-variant"><input type="checkbox" defaultChecked className="size-3.5 accent-primary" />次回から自動でログイン (30日間有効)</label>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-container">ログイン (Sign In to Workspace)<span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center align-middle text-[18px]"><Icon name="arrow_forward" /></span></button>
            </form>

            <p className="mt-7 text-center text-[11px] text-on-surface-variant">アカウントをお持ちでないですか？ <button type="button" onClick={showMockNotice} className="font-semibold text-secondary hover:underline">新規会員登録 (Sign Up Free)</button></p>
            <p role="status" className="mt-3 text-center text-xs text-secondary">{notice}</p>
          </div>
          <p className="mx-auto mt-auto max-w-[510px] pt-7 text-center text-[10px] leading-relaxed tracking-wide text-on-surface-variant">Protected by enterprise-grade encryption. Your CV and mock session voice data are strictly anonymized and used solely for personalizing Japanese career training.</p>
        </section>
      </div>
    </main>
  );
}
