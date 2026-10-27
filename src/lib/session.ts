// Signed session cookie using Web Crypto, so it works in middleware (edge) and route handlers.
export const COOKIE = "ledger_session";
const DAYS = 30;
const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(process.env.SESSION_SECRET ?? ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function passphraseOk(given: string): Promise<boolean> {
  const want = process.env.AUTH_PASSPHRASE;
  if (!want || !process.env.SESSION_SECRET) return false;
  return safeEqual(await hmac("pw:" + given), await hmac("pw:" + want));
}

export async function sign(): Promise<string> {
  const exp = String(Date.now() + DAYS * 864e5);
  return `${exp}.${await hmac(exp)}`;
}

export async function verify(token: string | undefined): Promise<boolean> {
  if (!token || !process.env.SESSION_SECRET) return false;
  const [exp, mac] = token.split(".");
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  return safeEqual(mac, await hmac(exp));
}

export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: DAYS * 86400 };
