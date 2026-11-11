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

type Person = { name: string; pin: string; apiSecret: string };

/** USERS is a JSON list of {name, pin, api_secret}; api_secret is that person's <NAME>_SECRET on the backend. Names are a-z, 0-9, _ or - so they fit in the cookie. */
function people(): Person[] {
  let list: { name?: string; pin?: string; api_secret?: string }[] = [];
  try { list = JSON.parse(process.env.USERS || "[]"); } catch { /* a broken USERS adds nobody */ }
  return list.map((u) => ({ name: u.name ?? "", pin: u.pin ?? "", apiSecret: u.api_secret ?? "" })).filter((p) => /^[a-z0-9_-]+$/.test(p.name) && p.pin && p.apiSecret);
}

/** The name if username and PIN match, or undefined. Every user is compared so timing does not say which one was close. */
export async function login(username: string, pin: string): Promise<string | undefined> {
  if (!process.env.SESSION_SECRET) return undefined;
  const given = await hmac(`${username.trim().toLowerCase()}:${pin}`);
  let hit: string | undefined;
  for (const p of people()) if (safeEqual(given, await hmac(`${p.name}:${p.pin}`))) hit = p.name;
  return hit;
}

export async function sign(user: string): Promise<string> {
  const body = `${Date.now() + DAYS * 864e5}.${user}`;
  return `${body}.${await hmac(body)}`;
}

/** The signed-in user's name, or undefined when the cookie is missing, forged, expired or names someone no longer listed. */
export async function verify(token: string | undefined): Promise<string | undefined> {
  if (!token || !process.env.SESSION_SECRET) return undefined;
  const [exp, user, mac] = token.split(".");
  if (!exp || !user || !mac || Number(exp) < Date.now()) return undefined;
  if (!safeEqual(mac, await hmac(`${exp}.${user}`))) return undefined;
  return people().some((p) => p.name === user) ? user : undefined;
}

/** The backend key for a signed-in user: it is what makes the backend answer from that user's own database. */
export function apiSecretFor(user: string): string | undefined {
  return people().find((p) => p.name === user)?.apiSecret;
}

export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: DAYS * 86400 };
