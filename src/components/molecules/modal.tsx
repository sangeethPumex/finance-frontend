"use client";

import { useEffect } from "react";
import { X } from "@phosphor-icons/react";

/** Centered dialog over a dimmed page; Escape or a backdrop click closes it. */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[90dvh] w-full ${wide ? "max-w-[760px]" : "max-w-[520px]"} overflow-y-auto border border-line bg-white p-6`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="eyebrow">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 place-items-center text-muted hover:bg-tint hover:text-ink"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
