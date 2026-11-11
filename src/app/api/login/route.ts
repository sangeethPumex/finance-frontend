import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, login, sign } from "@/lib/session";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { username?: unknown; pin?: unknown };
  const user = typeof body.username === "string" && typeof body.pin === "string" ? await login(body.username, body.pin) : undefined;
  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Wrong username or PIN" } }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await sign(user), cookieOptions);
  return res;
}
