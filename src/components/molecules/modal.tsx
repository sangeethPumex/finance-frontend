"use client";

import { useEffect } from "react";
import { X, type Icon } from "@phosphor-icons/react";
import { IconTile } from "../atoms";

/**
 * Centered dialog over a dimmed page; Escape or a backdrop click closes it.
 * The header carries an icon tile, a bold title and an optional one-line subtitle; the close button is red so it reads as "leave".
 */
export function Modal({ title, subtitle, icon, onClose, children, wide }: { title: string; subtitle?: string; icon?: Icon; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92dvh] w-full ${wide ? "sm:max-w-[760px]" : "sm:max-w-[520px]"} overflow-y-auto rounded-t-2xl border border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-xl sm:rounded-lg`}>
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white px-4 py-4 sm:px-6">
          {icon && <IconTile icon={icon} variant="solid" size="sm" />}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] font-semibold leading-tight tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-[12px] text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-md bg-loss/10 text-loss transition-colors hover:bg-loss hover:text-white"><X size={16} weight="bold" /></button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

/** Heading for a block inside a popup: small caps with a leading icon. */
export function SectionTitle({ icon: Icon, children, action }: { icon?: Icon; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{Icon && <Icon size={14} weight="bold" />}{children}</h3>
      {action}
    </div>
  );
}
