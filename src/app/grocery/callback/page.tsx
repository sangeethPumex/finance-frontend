"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Basket } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/atoms";
import { Card } from "@/components/molecules";
import { PageLayout } from "@/components/templates";
import { api } from "@/lib/api";

/** Swiggy sends the browser here after sign-in with ?code&state; the backend checks the state and swaps the code for tokens. */
export default function SwiggyCallback() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const once = useRef(false); // the code is single use; React's dev double-run must not spend it twice

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const q = new URLSearchParams(window.location.search);
    const code = q.get("code"), state = q.get("state");
    if (!code || !state) { setError(q.get("error_description") ?? q.get("error") ?? "Swiggy did not finish the sign-in"); return; }
    api("/grocery/swiggy/callback", { method: "POST", body: { code, state } })
      .then(() => { toast.success("Swiggy connected"); router.replace("/grocery"); })
      .catch((e: Error) => setError(e.message));
  }, [router]);

  return (
    <PageLayout title="Connecting Swiggy" icon={Basket} error={error}>
      <Card variant="flat">
        {error ? <Button onClick={() => router.replace("/grocery")}>Back to Grocery & Pantry</Button> : <p className="text-sub">Finishing the sign-in…</p>}
      </Card>
    </PageLayout>
  );
}
