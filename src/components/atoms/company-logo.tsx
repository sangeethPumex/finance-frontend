"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const LOGO_TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;

/** Logo sources in order of preference: logo.dev by ticker, then the site's favicon (Google's service, by domain). */
function sources(symbol?: string, domain?: string): string[] {
  const out: string[] = [];
  if (symbol && LOGO_TOKEN) out.push(`https://img.logo.dev/ticker/${encodeURIComponent(symbol)}?token=${LOGO_TOKEN}&size=128&format=png&fallback=404`);
  if (domain) out.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`);
  return out;
}

/** Company logo; a letter badge when no source is available or every one fails to load. */
export function CompanyLogo({ symbol, domain, name, className }: { symbol?: string; domain?: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(0);
  const src = sources(symbol, domain)[failed];
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-white text-[14px] font-medium text-muted", className)}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img key={src} src={src} alt="" loading="lazy" onError={() => setFailed((n) => n + 1)} className="size-full object-contain p-1.5" />
        : name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
