"use client";

import type { Flow, FlowTone } from "@/lib/api";
import { inr } from "@/lib/money";

export const TONE_COLOR: Record<FlowTone, string> = {
  income: "#1f8a5b", spend: "#1c1c1b", discretionary: "#c98a12", invest: "#3b6fd4", gap: "#d64545", net: "#a9a7a1", card: "#7c3aed",
};

const MEMO_H = 46;
const W = 900, H = 340, NODE = 10, GAP = 8, LX = 160, MX = W / 2 - NODE / 2, RX = W - 170;

type Placed = { flow: Flow; y: number; h: number };

function place(flows: Flow[], k: number): Placed[] {
  let y = 0;
  return flows.map((flow) => { const h = Math.max(flow.paise * k, 2); const p = { flow, y, h }; y += h + GAP; return p; });
}
const clip = (s: string) => (s.length > 20 ? `${s.slice(0, 19)}…` : s);

/**
 * Three-column money flow: sources, one pool of available money, destinations. Click a node or flow to select it.
 * memo is a figure that is already inside the destinations (card bill payments settle purchases counted as spending): it is drawn apart, with no flow.
 */
export function Sankey({ sources, dests, income, selected, onSelect, memo }: { sources: Flow[]; dests: Flow[]; income: number; selected?: string; onSelect: (f: Flow) => void; memo?: Flow }) {
  const total = sources.reduce((t, f) => t + f.paise, 0);
  if (total <= 0) return null;
  const k = (H - GAP * (Math.max(sources.length, dests.length) - 1)) / total;
  const left = place(sources, k), right = place(dests, k);
  const poolH = total * k, poolY = (H - poolH) / 2;

  let lo = poolY, ro = poolY;
  const links = [
    ...left.map((n) => { const h = n.flow.paise * k, from = n.y + n.h / 2, to = lo + h / 2; lo += h; return { n, h, x0: LX + NODE, y0: from, x1: MX, y1: to, a: n.flow.name, b: "Available money" }; }),
    ...right.map((n) => { const h = n.flow.paise * k, from = ro + h / 2, to = n.y + n.h / 2; ro += h; return { n, h, x0: MX + NODE, y0: from, x1: RX, y1: to, a: "Available money", b: n.flow.name }; }),
  ];
  const clickable = (f: Flow) => ({
    role: "button" as const, tabIndex: 0, style: { cursor: "pointer" }, onClick: () => onSelect(f),
    onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && onSelect(f),
  });

  return (
    // The labels are unreadable squeezed into a phone width, so below 640px the chart scrolls sideways inside its card.
    <div className="overflow-x-auto"><svg viewBox={`0 0 ${W} ${H + (memo ? MEMO_H : 0)}`} role="img" aria-label="Money flow from income sources to spending categories" className="h-auto w-full min-w-160">
      {links.map(({ n, h, x0, y0, x1, y1, a, b }, i) => {
        const mid = (x0 + x1) / 2;
        return (
          <path key={i} d={`M${x0},${y0} C${mid},${y0} ${mid},${y1} ${x1},${y1}`} fill="none" stroke={TONE_COLOR[n.flow.tone]} strokeWidth={Math.max(h, 1)}
            opacity={selected && selected !== n.flow.id ? 0.08 : 0.25} {...clickable(n.flow)}>
            <title>{`${a} → ${b}: ${inr(n.flow.paise)}`}</title>
          </path>
        );
      })}
      <rect x={MX} y={poolY} width={NODE} height={poolH} fill="#1c1c1b" />
      <text x={MX + NODE / 2} y={poolY - 8} textAnchor="middle" fontSize="11" fill="#737373">Available money · {inr(total)}</text>
      {left.map(({ flow, y, h }) => (
        <g key={flow.id} {...clickable(flow)}>
          <rect x={LX} y={y} width={NODE} height={h} fill={TONE_COLOR[flow.tone]} />
          <text x={LX - 8} y={y + h / 2 - 2} textAnchor="end" fontSize="11" fill="#1c1c1b">{clip(flow.name)}</text>
          <text x={LX - 8} y={y + h / 2 + 11} textAnchor="end" fontSize="10" fill="#737373">{inr(flow.paise)}</text>
          <title>{`${flow.name}: ${inr(flow.paise)}`}</title>
        </g>
      ))}
      {right.map(({ flow, y, h }) => (
        <g key={flow.id} {...clickable(flow)}>
          <rect x={RX} y={y} width={NODE} height={h} fill={TONE_COLOR[flow.tone]} />
          <text x={RX + NODE + 8} y={y + h / 2 - 2} fontSize="11" fill="#1c1c1b" fontWeight={selected === flow.id ? 600 : 400}>{clip(flow.name)}</text>
          <text x={RX + NODE + 8} y={y + h / 2 + 11} fontSize="10" fill="#737373">{inr(flow.paise)}{income > 0 ? ` · ${Math.round((flow.paise / income) * 100)}%` : ""}</text>
          <title>{`${flow.name}: ${inr(flow.paise)}`}</title>
        </g>
      ))}
      {memo && (
        <g {...clickable(memo)}>
          <rect x={RX} y={H + 14} width={NODE} height={MEMO_H - 22} fill="none" stroke={TONE_COLOR.card} strokeWidth={1.5} strokeDasharray="3 2" />
          <text x={RX + NODE + 8} y={H + 24} fontSize="11" fill="#1c1c1b" fontWeight={selected === memo.id ? 600 : 400}>{clip(memo.name)}</text>
          <text x={RX + NODE + 8} y={H + 37} fontSize="10" fill="#737373">{inr(memo.paise)} · already in spending</text>
          <title>{`${memo.name}: ${inr(memo.paise)}. These pay off card purchases already counted in the spending above, so they are not added again.`}</title>
        </g>
      )}
    </svg></div>
  );
}
