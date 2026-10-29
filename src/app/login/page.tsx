"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Eyebrow, Input } from "@/components/atoms";
import { InlineError } from "@/components/molecules";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const passphrase = String(new FormData(e.currentTarget).get("passphrase") ?? "");
    const res = await fetch("/api/login", { method: "POST", body: JSON.stringify({ passphrase }) });
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setError("Wrong passphrase");
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
          <Input name="passphrase" type="password" placeholder="Passphrase" aria-label="Passphrase" autoFocus autoComplete="current-password" required className="w-full" />
          <InlineError error={error} />
          <Button type="submit" loading={busy} size="lg" className="w-full">Sign in</Button>
        </form>
      </div>
    </main>
  );
}
