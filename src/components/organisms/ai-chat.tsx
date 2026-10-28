"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowClockwise, Check, Copy, PaperPlaneRight, Sparkle, Stop, Trash } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { Button } from "../atoms";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["How am I doing this month?", "Where is most of my money going?", "Can I afford a ₹20,000 purchase this week?", "How do I improve my savings rate?"];

// Model output is Markdown; style it here so the page needs no typography plugin.
const MD = "text-[14px] leading-relaxed [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-ink [&_h1]:mt-3 [&_h1]:text-[16px] [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-semibold [&_code]:bg-tint [&_code]:px-1 [&_code]:text-[13px] [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:bg-tint [&_pre]:p-3 [&_table]:my-2 [&_table]:block [&_table]:overflow-x-auto [&_table]:text-[13px] [&_th]:border [&_th]:border-line [&_th]:bg-subtle [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-line [&_td]:px-2 [&_td]:py-1 [&_a]:underline";

/** Streaming chat with the finance expert. The conversation lives in this component only; /dashboard/chat grounds each answer in this month's numbers. */
export function AiChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // follow the stream only while the reader is at the bottom
  const [copied, setCopied] = useState(-1);
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
      const res = await fetch("/api/dashboard/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }), signal: ctl.signal });
      if (res.status === 401) { window.location.href = "/login"; return; }
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => null))?.error ?? "The AI is unavailable right now");
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      for (let r = await reader.read(); !r.done; r = await reader.read()) {
        const chunk = r.value;
        setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, content: x.content + chunk } : x)));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      // An answer that never started is dropped so the next send does not carry an empty turn.
      setMsgs((m) => (m.at(-1)?.content ? m : m.slice(0, -1)));
      setBusy(false);
    }
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
      </header>
      <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }} className="min-h-0 flex-1 overflow-y-auto border-t border-line-soft">
        <div className={cn(COL, "flex min-h-full flex-col gap-6 py-6")}>
          {msgs.length === 0 ? (
            <div className="m-auto grid w-full justify-items-center gap-5 text-center">
              <span className={cn("grid size-14 place-content-center rounded-2xl text-white shadow-lg shadow-orange-500/20", GRAD)}><Sparkle size={26} weight="fill" /></span>
              <div>
                <h2 className="text-[18px] font-semibold text-ink">What would you like to know?</h2>
                <p className="mt-1 text-[13px] text-muted">Answers use this month&apos;s recorded numbers and your About Me notes.</p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((q) => <button key={q} type="button" onClick={() => send(q)} className="rounded-xl border border-line bg-white px-4 py-3 text-left text-[13px] text-sub transition-colors hover:border-orange-400 hover:bg-orange-50">{q}</button>)}
              </div>
            </div>
          ) : msgs.map((m, i) => (
            <div key={i} className={cn("group flex items-start gap-3", m.role === "user" && "justify-end")}>
              {m.role === "assistant" && <span className={cn("mt-0.5 grid size-7 shrink-0 place-content-center rounded-lg text-white", GRAD)}><Sparkle size={14} weight="fill" /></span>}
              <div className={cn("min-w-0", m.role === "user" ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-ink px-4 py-2.5 text-[14px] text-white" : "flex-1 pt-1 text-sub")}>
                {m.role === "user" ? m.content : m.content ? <div className={MD}><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div> : <span className="flex gap-1 py-2" aria-label="Thinking">{[0, 150, 300].map((d) => <i key={d} style={{ animationDelay: `${d}ms` }} className="size-1.5 animate-bounce rounded-full bg-orange-500" />)}</span>}
                {m.role === "assistant" && m.content && !(busy && i === msgs.length - 1) && (
                  <div className="mt-2 flex gap-1 opacity-100 transition-opacity focus-within:opacity-100 md:opacity-0 md:group-hover:opacity-100">
                    <button type="button" aria-label="Copy answer" className={act} onClick={() => { void navigator.clipboard?.writeText(m.content); setCopied(i); setTimeout(() => setCopied(-1), 1500); }}>{copied === i ? <Check size={14} /> : <Copy size={14} />}</button>
                    {i === msgs.length - 1 && <button type="button" aria-label="Try again" className={act} onClick={() => send(msgs[i - 1].content, msgs.slice(0, i - 1))}><ArrowClockwise size={14} /></button>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="shrink-0 border-t border-line bg-white pb-1 pt-3">
        <div className={COL}>
          {error && <p role="alert" className="pb-2 text-[13px] text-loss">{error}</p>}
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 rounded-2xl border border-strong bg-white p-2 focus-within:border-orange-500">
            {msgs.length > 0 && !busy && <Button type="button" variant="quiet" size="icon" icon={Trash} aria-label="Clear chat" onClick={() => { setMsgs([]); setError(""); }} />}
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
