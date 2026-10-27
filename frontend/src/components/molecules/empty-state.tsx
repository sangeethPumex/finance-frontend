"use client";

import { Tray, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export function EmptyState({ icon: Icon = Tray, action, className, children }: { icon?: Icon; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-12 text-center text-[13px] text-muted", className)}>
      <Icon size={28} className="text-faint" />
      <p>{children}</p>
      {action}
    </div>
  );
}
