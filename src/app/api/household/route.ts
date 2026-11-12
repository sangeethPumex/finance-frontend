import type { NextRequest } from "next/server";
import { COOKIE, everyone, verify } from "@/lib/session";

export const dynamic = "force-dynamic";

type Day = { date: string; paise: number; top?: { vendor: string; paise: number } };

/** Household totals: each person's cash, investments and daily spend, fetched with their own key. Only these figures leave the server, never raw transactions. */
export async function GET(req: NextRequest) {
  if (!(await verify(req.cookies.get(COOKIE)?.value))) return Response.json({ error: "Sign in first" }, { status: 401 });
  const base = process.env.API_BASE_URL?.replace(/\/$/, "");
  if (!base) return Response.json({ error: "API_BASE_URL is not set" }, { status: 500 });

  const get = async <T>(secret: string, path: string) => {
    const r = await fetch(base + path, { headers: { "X-API-Key": secret }, cache: "no-store" });
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as T;
  };
  const people = await Promise.all(everyone().map(async ({ name, secret }) => {
    try {
      const [d, days] = await Promise.all([
        get<{ position: { cashPaise: number; currentPaise: number } }>(secret, "/dashboard?period=month"),
        get<Day[]>(secret, "/dashboard/daily"),
      ]);
      return { name, cashPaise: d.position.cashPaise, investmentsPaise: d.position.currentPaise, days };
    } catch {
      return { name, cashPaise: 0, investmentsPaise: 0, days: [] as Day[], failed: true }; // one person's outage must not hide the other's numbers
    }
  }));
  return Response.json({ people: people.map(({ days, ...p }) => ({ ...p, days: days.filter((d) => d.paise > 0).slice(-14) })) });
}
