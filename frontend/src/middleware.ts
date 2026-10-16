import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// OWNER: M1 (frontend developer)
// Middleware: Intercepts /hr/* requests to guarantee authentication
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow design-check in development for easy theme testing
  if (pathname.startsWith("/hr/design-check")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/hr")) {
    // Check for Supabase session auth cookie
    const hasAuthCookie = request.cookies
      .getAll()
      .some((c) => c.name.includes("-auth-token") || c.name === "sb-access-token");

    // In local dev without auth initialized, allow pass-through to show mock UI
    const isDev = process.env.NODE_ENV === "development";
    if (!hasAuthCookie && !isDev) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/hr/:path*"],
};
