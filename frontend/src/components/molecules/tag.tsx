"use client";

import { X } from "@phosphor-icons/react";
import { Badge, type BadgeVariant } from "../atoms";

/** A Badge that can be removed. */
export function Tag({ children, variant, onRemove, removeLabel }: { children: React.ReactNode; variant?: BadgeVariant; onRemove?: () => void; removeLabel?: string }) {
  return (
    <Badge variant={variant}>
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={removeLabel ?? "Remove"} className="opacity-60 hover:opacity-100">
          <X size={11} />
        </button>
      )}
    </Badge>
  );
}
