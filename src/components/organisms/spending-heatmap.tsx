"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { useDailySpend } from "@/lib/api";
import { inr } from "@/lib/money";

// Grey to black; level 0 is an empty cell.
const SHADE = ["bg-line", "bg-strong", "bg-faint", "bg-muted", "bg-ink"];
const month = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
const when = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** A GitHub-style grid of the last 26 weeks, one cell a day, darker for heavier spending. Levels come from the backend. */
export function SpendingHeatmap() {
  const q = useDailySpend();
  const days = q.data, scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth; }, [days]); // newest weeks first on a narrow screen
  if (!days) return <p className="text-[13px] text-muted">{q.error ? q.error.message : "Loading…"}</p>;
  const total = days.reduce((t, d) => t + d.paise, 0), active = days.filter((d) => d.paise > 0).length;
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => days[i * 7]);

  return (
    <div className="rounded-lg border border-line bg-white px-4 py-5 sm:px-6">
      <h3 className="text-[15px] font-semibold tracking-tight">Every day you spent</h3>
      <p className="mt-0.5 text-[12px] text-muted">{inr(total)} over {active} days in the last 26 weeks. Excludes investments and transfers</p>
      <div ref={scroller} className="mt-4 overflow-x-auto pb-1">
        <div className="grid grid-flow-col grid-rows-[auto] gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks.length}, 12px)` }}>
          {weeks.map((w, i) => <span key={w.date} className="h-3.5 whitespace-nowrap text-[10px] text-muted">{i === 0 || month(w.date) !== month(weeks[i - 1].date) ? month(w.date) : ""}</span>)}
        </div>
        <div className="mt-1 grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks.length}, 12px)`, gridAutoColumns: "12px" }}>
          {days.map((d) => (
            <span key={d.date} className={cn("size-3 rounded-[2px]", SHADE[d.level])}
              title={d.paise > 0 ? `${when(d.date)} · ${inr(d.paise)}${d.top ? ` · biggest: ${d.top.vendor} ${inr(d.top.paise)}` : ""}` : `${when(d.date)} · no spending`} />
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted">
        Less {SHADE.map((c) => <span key={c} className={cn("size-3 rounded-[2px]", c)} />)} More
      </div>
    </div>
  );
}
