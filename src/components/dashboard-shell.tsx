"use client";

import type { AuthUser } from "@/lib/auth-types";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon, { type IconName } from "@/components/icon";
import styles from "./dashboard-sidebar.module.css";

type NavItem = {
  label: string;
  icon: IconName;
  anchor?: string;
  action?: string;
  section: string;
  badge?: string;
  badgeType?: "ai" | "new" | "dot";
  aliases?: string[];
};

const navigation: NavItem[] = [
  // Workspace Overview
  {
    label: "Dashboard",
    icon: "home",
    anchor: "/dashboard",
    section: "Overview",
    aliases: ["dashboard"],
  },
  {
    label: "My Profile",
    icon: "person",
    anchor: "/profile",
    section: "Overview",
    aliases: ["my profile", "profile"],
  },
  {
    label: "My CV",
    icon: "description",
    anchor: "/cv",
    section: "Overview",
    aliases: ["my cv", "cv"],
  },
  {
    label: "Job Description",
    icon: "business_center",
    anchor: "/dashboard#profile",
    section: "Overview",
    aliases: ["job description", "job-description"],
  },

  // Interview Lab
  {
    label: "Set Up Interview",
    icon: "play_arrow",
    anchor: "/interview-setup",
    section: "Interview Lab",
    badge: "Setup",
    badgeType: "new",
    aliases: ["interview setup", "set up interview", "interview-setup"],
  },
  {
    label: "Interview Room",
    icon: "video_chat",
    anchor: "/interview-room",
    section: "Interview Lab",
    badge: "AI Live",
    badgeType: "ai",
    aliases: ["interview room", "interview-room"],
  },
  {
    label: "Practice Weaknesses",
    icon: "track_changes",
    anchor: "/dashboard#practice",
    section: "Interview Lab",
    aliases: ["practice weaknesses", "practice-weaknesses", "practice"],
  },

  // Performance & Review
  {
    label: "Interview History",
    icon: "history",
    anchor: "/dashboard#history",
    section: "Analytics & History",
    aliases: ["interview history", "interview-history", "history"],
  },
  {
    label: "Progress & Analytics",
    icon: "trending_up",
    anchor: "/dashboard#analytics",
    section: "Analytics & History",
    aliases: ["progress & analytics", "progress-analytics", "analytics"],
  },

  // System
  {
    label: "Settings",
    icon: "settings_suggest",
    action: "settings",
    section: "System",
    aliases: ["settings"],
  },
];

const previews: Record<string, { title: string; description: string }> = {
  "interview-room": {
    title: "Interview Preview",
    description:
      "Practice for a Web Engineer role at Rakuten with 6 questions in about 20 minutes. Your interviewer is Tanaka, Tech Lead. This is a demo; AI, camera, and microphone features are not connected.",
  },
  "practice-weaknesses": {
    title: "Practice Preview",
    description:
      "Sample drills cover keigo (Japanese honorific language), particles, and structured answers using PREP. Voice practice is not connected in this demo.",
  },
  "my-cv": {
    title: "CV Preview",
    description:
      "Example CV experience: Laravel, Next.js, REST API design, and teamwork. Uploading and saving a CV are not available in this demo.",
  },
  "job-description": {
    title: "Target Job · Rakuten Symphony",
    description:
      "Cloud Platform & Web Application Engineer. Sample requirements: PHP/Laravel or Go/Java, RDBMS, REST APIs, and business Japanese at N2 or above. Illustrative match score: 88%.",
  },
  "interview-history": {
    title: "AI Report · Demo",
    description:
      "Sample feedback: Your technical explanations are well structured. Keep practicing keigo, particles, and questions for the interviewer. All dashboard scores are illustrative.",
  },
  "progress-analytics": {
    title: "Learning Progress",
    description:
      "Your sample score increased from 62 to 82 over 5 practice sessions. Strengths: technical explanations and motivation. Next focus: communication and questions for the interviewer.",
  },
  settings: {
    title: "Workspace Settings",
    description:
      "Sample career target: Target: Backend & Full-Stack roles at Japanese companies. Settings changes are not saved in this demo.",
  },
  notifications: {
    title: "Notifications",
    description:
      "Sample schedule: 6 days until your Rakuten interview. Today’s suggestion: spend 5 minutes reviewing particles and preparing questions for the interviewer.",
  },
};

export default function DashboardShell({
  children,
  user,
  activePage = "Dashboard",
}: {
  children: ReactNode;
  user: AuthUser;
  activePage?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const mobileClose = useRef<HTMLButtonElement>(null);

  async function signOut() {
    setSigningOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError("Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  }

  useEffect(() => {
    if (preview) dialog.current?.showModal();
  }, [preview]);

  useEffect(() => {
    if (!menuOpen) return;
    mobileClose.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuToggle.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
    menuToggle.current?.focus();
  }

  function isItemActive(item: NavItem): boolean {
    const normActive = (activePage || "").toLowerCase().trim();
    const normLabel = item.label.toLowerCase().trim();

    // 1. Direct label or alias match
    if (normActive === normLabel) return true;
    if (item.aliases?.some((alias) => alias === normActive)) return true;

    // 2. Direct pathname match for dedicated routes
    if (item.anchor && !item.anchor.includes("#")) {
      if (item.anchor === "/dashboard") {
        return pathname === "/dashboard" && (!normActive || normActive === "dashboard");
      }
      return pathname === item.anchor || pathname.startsWith(`${item.anchor}/`);
    }

    return false;
  }

  const userInitial = user.name.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() || "U";

  // Group navigation items by section while preserving ordering
  const sections: { title: string; items: NavItem[] }[] = [];
  navigation.forEach((item) => {
    let group = sections.find((s) => s.title === item.section);
    if (!group) {
      group = { title: item.section, items: [] };
      sections.push(group);
    }
    group.items.push(item);
  });

  return (
    <div
      className="dashboard min-h-screen bg-surface text-body-md"
      onClick={(event) => {
        const action = (event.target as HTMLElement).closest<HTMLElement>("[data-mock]")?.dataset.mock;
        if (action) {
          setPreview(action);
          setMenuOpen(false);
        }
      }}
    >
      <a
        href="#dashboard-content"
        className="sr-only fixed top-2 left-2 z-[70] rounded bg-white p-3 shadow-md focus:not-sr-only"
      >
        Skip to dashboard
      </a>

      {/* Mobile Backdrop */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeMenu}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        id="dashboard-navigation"
        aria-label="Workspace navigation"
        className={`${styles.sidebar} fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-200 ease-in-out motion-reduce:transition-none ${
          menuOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        } lg:visible lg:translate-x-0`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 px-5">
          <Link
            href="/"
            aria-label="Aizuchi.AI — Home"
            className="flex items-center gap-2 transition-opacity hover:opacity-90"
          >
            <Image
              src="/logo.svg"
              alt="Aizuchi.AI"
              width={146}
              height={36}
              priority
              className="h-8 w-auto object-contain"
            />
          </Link>
          <button
            ref={mobileClose}
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Workspace Quick Status Card */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 transition-colors hover:border-slate-300 hover:bg-slate-100/60">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="domain" className="text-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-xs font-semibold text-slate-900">Workspace</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-500">Tokyo · JLPT N2 Prep</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className={`${styles.navigation} flex-1 overflow-y-auto px-3 py-2 space-y-4`}>
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 pt-2 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              {section.items.map((item) => {
                const isActive = isItemActive(item);
                const itemClass = `group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-primary text-white font-semibold shadow-sm shadow-primary/20"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`;

                const content = (
                  <>
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 group-hover:text-slate-800"
                      }`}
                    >
                      <Icon name={item.icon} className="text-[18px]" />
                    </span>
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide transition-colors ${
                          isActive
                            ? "bg-white/20 text-white"
                            : item.badgeType === "ai"
                            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20"
                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && !item.badge && (
                      <span className="size-1.5 rounded-full bg-secondary-container" aria-hidden="true" />
                    )}
                  </>
                );

                if (item.anchor) {
                  return (
                    <Link
                      key={item.label}
                      href={item.anchor}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                      className={itemClass}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.label}
                    type="button"
                    data-mock={item.action}
                    className={itemClass}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Quick Sign Out Action in Nav */}
          <div className="pt-2">
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all disabled:opacity-50"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-rose-100/80 group-hover:text-rose-600 transition-all">
                <Icon name="logout" className="text-[18px]" />
              </span>
              <span className="flex-1 truncate text-left">
                {signingOut ? "Signing out..." : "Logout"}
              </span>
            </button>
            {logoutError && (
              <p role="alert" className="mt-2 px-3 text-xs text-error">
                {logoutError}
              </p>
            )}
          </div>
        </nav>

        {/* User Account Footer Card */}
        <div className="shrink-0 border-t border-slate-200/80 p-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/60 bg-slate-50/80 p-2.5 transition-colors hover:bg-slate-100/80">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-secondary font-bold text-xs text-white shadow-xs ring-2 ring-white">
              {userInitial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-[10.5px] text-slate-500" title={user.email}>
                {user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-50"
            >
              <Icon name="logout" className="text-[17px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              ref={menuToggle}
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="dashboard-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Icon name="menu" className="text-[20px]" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="hover:text-slate-800 transition-colors">Console</span>
              <Icon name="chevron_right" className="text-[14px] text-slate-400" />
              <span className="font-semibold text-primary">{activePage}</span>
            </div>
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 2xl:inline">
              Target: Web Developer · Rakuten / LINE Yahoo! / Mercari
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/interview-setup"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-container transition-all"
            >
              <Icon name="play_arrow" className="text-[16px]" />
              <span className="hidden sm:inline">Start New Interview</span>
              <span className="sm:hidden">Start</span>
            </Link>
            <button
              type="button"
              data-mock="notifications"
              aria-label="Notifications"
              className="relative flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <Icon name="notifications" className="text-[20px]" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-error ring-2 ring-white" />
            </button>
          </div>
        </header>
        <main id="dashboard-content" className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6">
          <div className="mb-4 flex items-center gap-2 text-[11px] text-on-surface-variant">
            <span className="size-1.5 rounded-full bg-secondary" />
            Signed in · Interview data is illustrative
          </div>
          {children}
        </main>
      </div>

      {/* Preview Dialog */}
      <dialog
        ref={dialog}
        onClose={() => setPreview(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        aria-labelledby="preview-title"
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl bg-white p-6 text-on-surface shadow-xl backdrop:bg-primary/50"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="preview-title" className="text-lg font-semibold text-primary">
            {preview && previews[preview]?.title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-7 text-on-surface-variant">
          {preview && previews[preview]?.description}
        </p>
        {preview === "settings" && (
          <p className="mt-3 text-sm">
            Signed in as {user.name} · {user.email}
          </p>
        )}
        <form method="dialog" className="mt-6 flex justify-end">
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-container transition-colors">
            Got It
          </button>
        </form>
      </dialog>
    </div>
  );
}
