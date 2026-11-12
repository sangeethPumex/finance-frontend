"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Eyebrow, Input } from "@/components/atoms";
import { InlineError } from "@/components/molecules";

export default function LoginPage() {
  const router = useRouter(), qc = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/login", { method: "POST", body: JSON.stringify({ username: f.get("username"), pin: f.get("pin") }) });
    if (res.ok) {
      qc.clear(); // signing in as someone else in the same tab must not show the last person's cached data
      router.replace("/");
      router.refresh();
    } else {
      setError("Wrong username or PIN");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh bg-canvas md:grid-cols-[1.1fr_1fr]">
      <div aria-hidden className="relative h-44 bg-black bg-cover bg-center md:h-auto" style={{ backgroundImage: "url(/login-bg.jpg)" }}>
        <span className="absolute bottom-4 left-5 hidden text-[11px] uppercase tracking-[0.3em] text-white/60 md:block">Every rupee, accounted for</span>
      </div>
      <div className="grid place-items-center px-6 py-12">
        <form onSubmit={submit} className="flex w-full max-w-[300px] flex-col gap-6">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/catalyst-full.svg" alt="Catalyst" className="h-9 w-auto" />
            <Eyebrow className="mt-3 tracking-[0.2em]">Personal finance</Eyebrow>
          </div>
          <Input name="username" placeholder="Username" aria-label="Username" autoFocus autoComplete="username" autoCapitalize="none" required className="w-full" />
          <Input name="pin" type="password" inputMode="numeric" placeholder="PIN" aria-label="PIN" autoComplete="current-password" required className="w-full" />
          <InlineError error={error} />
          <Button type="submit" loading={busy} size="lg" className="w-full">Sign in</Button>
        </form>
      </div>
    </main>
  );
}
