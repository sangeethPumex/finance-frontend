import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, passphraseOk, sign } from "@/lib/session";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { passphrase?: unknown };
  if (typeof body.passphrase !== "string" || !(await passphraseOk(body.passphrase))) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Wrong passphrase" } }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await sign(), cookieOptions);
  return res;
}
