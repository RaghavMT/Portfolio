import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/server/auth/session";

/**
 * UX convenience only (SPEC §12.3 #1): sends logged-out visitors to the login page. It checks
 * signature + expiry but never the DB; requireAdmin() is the real boundary.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET ?? "",
  );
  if (session) return NextResponse.next();

  const login = new URL("/admin/login", request.url);
  const target = pathname + search;
  if (target !== "/admin") login.searchParams.set("next", target);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
