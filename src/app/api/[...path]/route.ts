import type { NextRequest } from "next/server";
import { COOKIE, apiSecretFor, verify } from "@/lib/session";

export const dynamic = "force-dynamic";

// Browser calls land here; the server adds X-API-Key and forwards to ledger-backend.
async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const target = "/" + path.map(encodeURIComponent).join("/") + req.nextUrl.search;
  const hasBody = req.method !== "GET" && req.method !== "DELETE";
  // Raw bytes, so file uploads (photos, PDFs) pass through as well as JSON.
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const base = process.env.API_BASE_URL;
  // The key comes from who is signed in, never from the browser, so one user cannot reach another's data.
  const user = await verify(req.cookies.get(COOKIE)?.value);
  const secret = user && apiSecretFor(user);
  if (!base || !secret) {
    return Response.json({ error: base ? "Sign in first" : "API_BASE_URL is not set" }, { status: base ? 401 : 500 });
  }
  try {
    const res = await fetch(base.replace(/\/$/, "") + target, {
      method: req.method,
      headers: { "X-API-Key": secret, ...(hasBody ? { "Content-Type": req.headers.get("content-type") ?? "application/json" } : {}) },
      body,
      cache: "no-store",
    });
    return new Response(res.status === 204 ? null : res.body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json", ...(res.headers.get("cache-control") ? { "Cache-Control": res.headers.get("cache-control")! } : {}) },
    });
  } catch {
    return Response.json({ error: "Could not reach the backend" }, { status: 502 });
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
