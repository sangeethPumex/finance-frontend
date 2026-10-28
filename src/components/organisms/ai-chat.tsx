"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PaperPlaneRight, Sparkle, Stop, Trash } from "@phosphor-icons/react";
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
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs]);
  useEffect(() => () => abort.current?.abort(), []);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setInput(""); setError(""); setBusy(true);
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

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col md:h-[calc(100dvh-9rem)]">
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {msgs.length === 0 ? (
          <div className="grid h-full place-content-center justify-items-center gap-4 text-center">
            <Sparkle size={28} weight="duotone" className="text-muted" />
            <p className="text-[13px] text-muted">Ask anything about your money. Answers use this month&apos;s numbers and your About Me notes.</p>
            <div className="flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => send(s)} className="border border-line px-3 py-2 text-left text-[13px] text-sub transition-colors hover:bg-tint">{s}</button>)}
            </div>
          </div>
        ) : msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" && "justify-end")}>
            <div className={cn("max-w-[92%] px-4 py-3 md:max-w-[75%]", m.role === "user" ? "whitespace-pre-wrap bg-ink text-[14px] text-white" : "border border-line bg-white text-sub")}>
              {m.role === "user" ? m.content : m.content ? <div className={MD}><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div> : <span className="animate-pulse text-muted">Thinking…</span>}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {error && <p role="alert" className="pb-2 text-[13px] text-loss">{error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 border-t border-line bg-white pt-3">
        <textarea
          value={input} onChange={(e) => setInput(e.target.value)} rows={1} aria-label="Ask a question" placeholder="Ask about your money…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          className="max-h-32 min-h-11 flex-1 resize-none border border-strong px-3 py-2.5 text-[16px] md:text-[14px]"
        />
        {busy ? <Button type="button" variant="ghost" size="icon" icon={Stop} aria-label="Stop" onClick={() => abort.current?.abort()} /> : <Button type="submit" size="icon" icon={PaperPlaneRight} aria-label="Send" disabled={!input.trim()} />}
        {msgs.length > 0 && !busy && <Button type="button" variant="quiet" size="icon" icon={Trash} aria-label="Clear chat" onClick={() => { setMsgs([]); setError(""); }} />}
      </form>
    </div>
  );
}
