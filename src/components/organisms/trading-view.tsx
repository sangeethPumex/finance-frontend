"use client";

import { useEffect, useRef } from "react";

/** Yahoo form (RELIANCE.NS, M&M.BO) to TradingView's (NSE:RELIANCE, BSE:M_M). */
export const tvSymbol = (yahoo: string) => {
  const [base, sfx] = yahoo.toUpperCase().split(".");
  return `${sfx === "BO" ? "BSE" : "NSE"}:${base.replace(/[^A-Z0-9]/g, "_")}`;
};

/** A TradingView embed widget (https://www.tradingview.com/widget-docs/widgets/). Remounts when the config changes. */
function Widget({ script, config, className }: { script: string; config: object; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const json = JSON.stringify(config);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const s = document.createElement("script");
    s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${script}.js`;
    s.async = true;
    s.innerHTML = json;
    host.appendChild(s);
    return () => { host.replaceChildren(); };
  }, [script, json]);
  return <div ref={ref} className={`tradingview-widget-container ${className ?? ""}`} />;
}

export const StockChart = ({ symbol }: { symbol: string }) => (
  <Widget script="advanced-chart" className="h-96 w-full border border-line" config={{ autosize: true, symbol: tvSymbol(symbol), interval: "D", range: "12M", timezone: "Asia/Kolkata", theme: "light", style: "1", locale: "en", allow_symbol_change: false, hide_side_toolbar: true, support_host: "https://www.tradingview.com" }} />
);

export const TickerTape = ({ symbols }: { symbols: string[] }) => (
  <Widget script="ticker-tape" className="h-18 overflow-hidden border border-line" config={{ symbols: symbols.map((s) => ({ proName: tvSymbol(s), title: s.split(".")[0] })), showSymbolLogo: false, colorTheme: "light", isTransparent: false, displayMode: "adaptive", locale: "en" }} />
);
