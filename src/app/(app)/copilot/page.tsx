"use client";

import { Compass } from "@phosphor-icons/react";
import { PanelSkeleton } from "@/components/molecules";
import { CardAdviceCard, HabitsCard, NowCard, NudgeInbox, PurchaseCheck, PushCard, WantsList, WeekAhead } from "@/components/organisms";
import { PageLayout } from "@/components/templates";
import { useCopilot, useCopilotWants, useNudges } from "@/lib/api";

/** What to do now. Every number comes from the backend's copilot module; nothing here is calculated. */
export default function Copilot() {
  const q = useCopilot(), inbox = useNudges(), wants = useCopilotWants(), o = q.data;
  return (
    <PageLayout title="Copilot" icon={Compass} description="Pause, slow down, go ahead or wait, with the number behind it" error={q.error || inbox.error || wants.error}>
      <PushCard />
      {o ? <NowCard o={o} /> : <PanelSkeleton />}
      <div className="mt-4"><PurchaseCheck /></div>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          {inbox.data ? <NudgeInbox inbox={inbox.data} /> : <PanelSkeleton />}
          <WantsList items={wants.data ?? []} />
        </div>
        <div className="space-y-4">
          {o && <WeekAhead w={o.week} />}
          {o && <HabitsCard o={o} />}
          {o && <CardAdviceCard items={o.cardAdvice} />}
        </div>
      </div>
    </PageLayout>
  );
}
