"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Divider, Eyebrow, Input } from "@/components/atoms";
import { InlineError } from "@/components/molecules";
import { CenteredLayout } from "@/components/templates";

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
    <CenteredLayout>
      <form onSubmit={submit} className="flex w-full max-w-[280px] flex-col items-center gap-6 text-center">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/catalyst-full.svg" alt="Catalyst" className="mx-auto h-10 w-auto" />
          <Eyebrow className="mt-2 tracking-[0.2em]">Personal finance</Eyebrow>
        </div>
        <Divider variant="accent" />
        <Input name="passphrase" type="password" placeholder="Passphrase" aria-label="Passphrase" autoFocus autoComplete="current-password" required className="w-full text-center" />
        <InlineError error={error} />
        <Button type="submit" loading={busy} className="w-full">Sign In</Button>
      </form>
    </CenteredLayout>
  );
}
