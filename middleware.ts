import { NextResponse, type NextRequest } from "next/server";

/** Owner bypass: /any-page?owner=OWNER_KEY stores the key in a cookie, then drops it from the URL. */
export function middleware(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("owner");
  if (!key) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.searchParams.delete("owner");
  const res = NextResponse.redirect(url);
  if (process.env.OWNER_KEY && key === process.env.OWNER_KEY) {
    res.cookies.set("sh_owner", key, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 90, path: "/" });
  }
  return res;
}

export const config = { matcher: ["/((?!api|_next|.*\\.).*)"] };
