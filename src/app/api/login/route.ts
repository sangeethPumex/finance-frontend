import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, login, sign } from "@/lib/session";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { passphrase?: unknown };
  const user = typeof body.passphrase === "string" ? await login(body.passphrase) : undefined;
  if (!user) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Wrong passphrase" } }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await sign(user), cookieOptions);
  return res;
}
