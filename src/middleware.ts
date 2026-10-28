import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verify } from "@/lib/session";

export async function middleware(req: NextRequest) {
  if (await verify(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Sign in first" } }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!_next/|favicon.ico|login|api/login|manifest.webmanifest|pwa-icon|apple-icon|catalyst-.*svg).*)"] };
