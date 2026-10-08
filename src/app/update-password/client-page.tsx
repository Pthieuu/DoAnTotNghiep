"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/icon";

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = form.get("password") as string;
    
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/update-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to update password.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.replace("/dashboard");
          router.refresh();
        }, 2000);
      }
    } catch { 
      setError("Cannot connect. Check your connection and try again."); 
    }
    setPending(false);
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4 py-10">
        <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-[0_16px_28px_-12px_rgba(15,23,42,0.28)] p-7 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Icon name="check" />
          </div>
          <h2 className="text-xl font-bold text-primary">Password Updated</h2>
          <p className="mt-2 text-sm text-on-surface-variant">Your password has been successfully updated. Redirecting to dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-[0_16px_28px_-12px_rgba(15,23,42,0.28)] p-7">
        <h2 className="text-2xl font-bold text-primary">Update Password</h2>
        <p className="mt-2 text-[13px] text-on-surface-variant">Please enter your new password below.</p>
        
        <form onSubmit={submit} className="mt-6 space-y-4" aria-busy={pending}>
          <fieldset disabled={pending} className="space-y-4 disabled:opacity-60">
            <div>
              <label htmlFor="password" className="mb-1 block text-[11px] text-primary">New Password</label>
              <div className="relative">
                <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center align-middle pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[18px] text-outline"><Icon name="lock" /></span>
                <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} placeholder="••••••••••••" required className="w-full rounded-sm bg-surface-container-low py-3 pr-11 pl-10 text-[13px] outline-offset-2 placeholder:text-outline focus:outline-2 focus:outline-secondary" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 right-2 z-10 flex size-8 -translate-y-1/2 items-center justify-center text-outline hover:text-primary transition-colors cursor-pointer"><span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center align-middle text-[18px]"><Icon name={showPassword ? "visibility_off" : "visibility"} /></span></button>
              </div>
            </div>
            
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-container">
              {pending ? "Updating…" : "Update Password"}
            </button>
            <p className="text-xs text-on-surface-variant">Use at least 12 characters.</p>
          </fieldset>
          {error && <p role="alert" className="text-sm text-error">{error}</p>}
        </form>
      </div>
    </main>
  );
}
