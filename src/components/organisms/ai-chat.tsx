"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, ArrowRight, Check, ClockCounterClockwise, Copy, PaperPlaneRight, Plus, Sparkle, Stop, Trash, X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/money";
import { Button } from "../atoms";

type Source = "recorded" | "estimated" | "told";
type Metric = { label: string; rupees?: number; text?: string; source: Source; note?: string };
type Answer = { conclusion: string; metrics: Metric[]; insights: string[]; links: { label: string; href: string }[] };
// content is what the model sees on later turns (an answer's conclusion); answer is what is drawn.
type Msg = { role: "user" | "assistant"; content: string; answer?: Answer };
type ChatItem = { id: string; title: string; updatedAt: string };

const SOURCE: Record<Source, { label: string; dot: string }> = {
  recorded: { label: "Recorded", dot: "bg-gain" },
  estimated: { label: "Estimated", dot: "bg-amber-400" },
  told: { label: "You told me", dot: "bg-sky-400" },
};

const SUGGESTIONS = ["How am I doing this month?", "Where is most of my money going?", "Can I afford a ₹20,000 purchase this week?", "How do I improve my savings rate?"];

function AnswerView({ a }: { a: Answer }) {
  return (
    <div className="space-y-4">
      <p className="text-[15px] leading-relaxed text-ink">{a.conclusion}</p>
      {a.metrics.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {a.metrics.map((m, i) => (
            <div key={i} className="min-w-0 rounded-xl border border-line bg-surface p-3">
              <p className="truncate text-[12px] text-muted">{m.label}</p>
              <p className="num mt-0.5 truncate text-[18px] font-semibold text-ink">{m.rupees !== undefined ? inr(Math.round(m.rupees * 100)) : m.text}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted"><i className={cn("size-1.5 shrink-0 rounded-full", SOURCE[m.source].dot)} />{SOURCE[m.source].label}</p>
              {m.note && <p className="mt-1 text-[12px] text-sub">{m.note}</p>}
            </div>
          ))}
        </div>
      )}
      {a.insights.length > 0 && <ul className="list-disc space-y-1 pl-5 text-[14px] leading-relaxed">{a.insights.map((t, i) => <li key={i}>{t}</li>)}</ul>}
      {a.links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {a.links.map((l) => <Link key={l.href} href={l.href} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[13px] text-ink transition-colors hover:border-orange-400 hover:bg-orange-50">{l.label}<ArrowRight size={12} /></Link>)}
        </div>
      )}
    </div>
  );
}

const plain = (a?: Answer, fallback = "") => (a ? [a.conclusion, ...a.insights.map((t) => `- ${t}`)].join("\n") : fallback);

/** Chat with the finance expert. Each answer is structured (conclusion, figures with where they came from, insights, links); conversations are saved by the backend. */
export function AiChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // keep the newest answer in view only while the reader is at the bottom
  const chatId = useRef(""); // set by the backend on the first answer; sent back so later turns update the same saved chat
  const [copied, setCopied] = useState(-1);
  const [past, setPast] = useState<ChatItem[] | null>(null); // null = history panel closed
  useEffect(() => { const el = scroller.current; if (el && stick.current) el.scrollTop = el.scrollHeight; }, [msgs]);
  useEffect(() => () => { abort.current?.abort(); }, []);

  async function send(text: string, base: Msg[] = msgs) {
    const q = text.trim();
    if (!q || busy) return;
    stick.current = true;
    const history: Msg[] = [...base, { role: "user", content: q }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setInput(""); if (box.current) box.current.style.height = "auto"; setError(""); setBusy(true);
    const ctl = (abort.current = new AbortController());
    try {
      const res = await fetch("/api/dashboard/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chatId: chatId.current, messages: history }), signal: ctl.signal });
      if (res.status === 401) { window.location.href = "/login"; return; }
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.answer) throw new Error(json?.error ?? "The AI is unavailable right now");
      chatId.current = json.chatId;
      setMsgs([...history, { role: "assistant", content: json.answer.conclusion, answer: json.answer }]);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      // An answer that never arrived is dropped so the next send does not carry an empty turn.
      setMsgs((m) => (m.at(-1)?.content ? m : m.slice(0, -1)));
      setBusy(false);
    }
  }

  function reset() { abort.current?.abort(); chatId.current = ""; setMsgs([]); setError(""); setPast(null); }

  async function openHistory() {
    if (past) { setPast(null); return; }
    setPast([]);
    try { setPast(await (await fetch("/api/dashboard/chats", { cache: "no-store" })).json()); } catch { setPast(null); setError("Could not load saved chats"); }
  }

  async function load(id: string) {
    try {
      const res = await fetch(`/api/dashboard/chats/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const c = await res.json();
      abort.current?.abort(); chatId.current = c.id; setMsgs(c.messages ?? []); setError(""); setPast(null); stick.current = true;
    } catch { setError("Could not open that chat"); }
  }

  async function remove(id: string) {
    setPast((p) => p?.filter((c) => c.id !== id) ?? p);
    await fetch(`/api/dashboard/chats/${id}`, { method: "DELETE" }).catch(() => null);
    if (chatId.current === id) reset();
  }

  const GRAD = "bg-gradient-to-br from-orange-500 to-black";
  const COL = "mx-auto w-full max-w-[880px] px-1 md:px-4";
  const act = "grid size-7 place-content-center rounded-md text-muted hover:bg-tint hover:text-ink";
  // Fills the viewport minus AppShell's padding (and the mobile nav), so only the conversation scrolls.
  return (
    <div className="flex h-[calc(100dvh-7rem-env(safe-area-inset-bottom))] flex-col md:h-[calc(100dvh-6rem)]">
      <header className="flex shrink-0 items-center gap-3 pb-4">
        <span className={cn("grid size-9 place-content-center rounded-lg text-white", GRAD)}><Sparkle size={18} weight="fill" /></span>
        <div>
          <h1 className="text-[18px] font-semibold leading-tight text-ink">AI Expert</h1>
          <p className="text-[13px] text-muted">Your personal financial analyst</p>
        </div>
        <div className="ml-auto flex gap-1">
          {msgs.length > 0 && !busy && <Button type="button" variant="quiet" size="icon" icon={Plus} aria-label="New chat" onClick={reset} />}
          <Button type="button" variant="quiet" size="icon" icon={past ? X : ClockCounterClockwise} aria-label={past ? "Close history" : "Past chats"} onClick={openHistory} />
        </div>
      </header>
      {past && (
        <div className="mb-3 max-h-56 shrink-0 overflow-y-auto rounded-xl border border-line bg-surface">
          {past.length === 0 ? <p className="p-4 text-[13px] text-muted">No saved chats yet.</p> : past.map((c) => (
            <div key={c.id} className="flex items-center gap-2 border-b border-line-soft px-3 py-2 last:border-0">
              <button type="button" onClick={() => load(c.id)} className="min-w-0 flex-1 text-left"><span className="block truncate text-[13px] text-ink">{c.title}</span><span className="text-[11px] text-muted">{new Date(c.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></button>
              <button type="button" aria-label="Delete chat" className="grid size-7 shrink-0 place-content-center rounded-md text-muted hover:bg-tint hover:text-loss" onClick={() => remove(c.id)}><Trash size={14} /></button>
            </div>
          ))}
        </div>
      )}
      <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} className="min-h-0 flex-1 overflow-y-auto border-t border-line-soft">
        <div className={cn(COL, "flex min-h-full flex-col gap-6 py-6")}>
          {msgs.length === 0 ? (
            <div className="m-auto grid w-full justify-items-center gap-5 text-center">
              <span className={cn("grid size-14 place-content-center rounded-2xl text-white shadow-lg shadow-orange-500/20", GRAD)}><Sparkle size={26} weight="fill" /></span>
              <div>
                <h2 className="text-[18px] font-semibold text-ink">What would you like to know?</h2>
                <p className="mt-1 text-[13px] text-muted">Answers use your recorded numbers, exact lookups and what you have told me.</p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((q) => <button key={q} type="button" onClick={() => send(q)} className="rounded-xl border border-line bg-surface px-4 py-3 text-left text-[13px] text-sub transition-colors hover:border-orange-400 hover:bg-orange-50">{q}</button>)}
              </div>
            </div>
          ) : msgs.map((m, i) => (
            <div key={i} className={cn("group flex items-start gap-3", m.role === "user" && "justify-end")}>
              {m.role === "assistant" && <span className={cn("mt-0.5 grid size-7 shrink-0 place-content-center rounded-lg text-white", GRAD)}><Sparkle size={14} weight="fill" /></span>}
              <div className={cn("min-w-0", m.role === "user" ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-ink px-4 py-2.5 text-[14px] text-white" : "flex-1 pt-1 text-sub")}>
                {m.role === "user" ? m.content : m.answer ? <AnswerView a={m.answer} /> : m.content ? <p className="text-[14px] leading-relaxed">{m.content}</p> : <span className="flex gap-1 py-2" aria-label="Thinking">{[0, 150, 300].map((d) => <i key={d} style={{ animationDelay: `${d}ms` }} className="size-1.5 animate-bounce rounded-full bg-orange-500" />)}</span>}
                {m.role === "assistant" && m.content && !(busy && i === msgs.length - 1) && (
                  <div className="mt-2 flex gap-1 opacity-100 transition-opacity focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100">
                    <button type="button" aria-label="Copy answer" className={act} onClick={() => { void navigator.clipboard?.writeText(plain(m.answer, m.content)); setCopied(i); setTimeout(() => setCopied(-1), 1500); }}>{copied === i ? <Check size={14} /> : <Copy size={14} />}</button>
                    {i === msgs.length - 1 && <button type="button" aria-label="Try again" className={act} onClick={() => send(msgs[i - 1].content, msgs.slice(0, i - 1))}><ArrowClockwise size={14} /></button>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="shrink-0 border-t border-line bg-surface pb-1 pt-3">
        <div className={COL}>
          {error && <p role="alert" className="pb-2 text-[13px] text-loss">{error}</p>}
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 rounded-2xl border border-strong bg-surface p-2 focus-within:border-orange-500">
            <textarea
              ref={box} value={input} rows={1} aria-label="Ask a question" placeholder="Ask about your money…"
              onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              className="max-h-40 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-[16px] outline-none focus-visible:outline-none md:text-[14px]"
            />
            {busy
              ? <Button type="button" variant="ghost" size="icon" icon={Stop} aria-label="Stop" onClick={() => abort.current?.abort()} />
              : <button type="submit" aria-label="Send" disabled={!input.trim()} className={cn("grid size-10 shrink-0 place-content-center rounded-xl text-white transition-opacity disabled:opacity-30", GRAD)}><PaperPlaneRight size={18} weight="fill" /></button>}
          </form>
        </div>
      </div>
    </div>
  );
}
