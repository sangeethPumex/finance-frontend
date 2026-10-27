import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Browser calls land here; the server adds X-API-Key and forwards to ledger-backend.
async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const target = "/" + path.map(encodeURIComponent).join("/") + req.nextUrl.search;
  const hasBody = req.method !== "GET" && req.method !== "DELETE";
  const body = hasBody ? await req.text() : undefined;

  const base = process.env.API_BASE_URL;
  if (!base || !process.env.API_SECRET) {
    return Response.json({ error: "API_BASE_URL and API_SECRET are not set" }, { status: 500 });
  }
  try {
    const res = await fetch(base.replace(/\/$/, "") + target, {
      method: req.method,
      headers: { "X-API-Key": process.env.API_SECRET, ...(hasBody ? { "Content-Type": "application/json" } : {}) },
      body,
      cache: "no-store",
    });
    return new Response(res.status === 204 ? null : res.body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return Response.json({ error: "Could not reach the backend" }, { status: 502 });
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
