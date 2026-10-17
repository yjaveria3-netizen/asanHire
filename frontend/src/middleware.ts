import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isHrPath = pathname.startsWith("/hr");
  const isLoginPath = pathname === "/login";

  // Public paths (/, /jobs/*, /interview/*, etc.) stay open and load immediately
  if (!isHrPath && !isLoginPath) {
    return NextResponse.next();
  }

  // Fast check: look for any Supabase auth token cookies
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.includes("sb-") || c.name.includes("-auth-token")
  );

  // If accessing /hr without an auth cookie, redirect immediately to /login
  if (isHrPath && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // If accessing /login without an auth cookie, allow viewing the login page
  if (isLoginPath && !hasAuthCookie) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase environment is unconfigured or a placeholder, do not attempt network calls
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("placeholder")) {
    if (isHrPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const role = (user?.user_metadata?.role as string) || "candidate";

    // 1. Redirect to /login if no active user session on /hr
    if (isHrPath && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // 2. Candidate accessing /hr -> redirect immediately to /jobs
    if (isHrPath && role === "candidate") {
      const url = request.nextUrl.clone();
      url.pathname = "/jobs";
      return NextResponse.redirect(url);
    }

    // 3. Redirect if logged-in user visits /login (unless explicit logout)
    if (isLoginPath && user) {
      const isExplicitLogout =
        request.nextUrl.searchParams.has("logout") ||
        request.nextUrl.searchParams.has("signout") ||
        request.nextUrl.searchParams.has("logged_out");

      if (!isExplicitLogout) {
        const url = request.nextUrl.clone();
        if (role === "admin") {
          url.pathname = "/admin";
        } else if (role === "candidate") {
          url.pathname = "/jobs";
        } else {
          url.pathname = "/hr";
        }
        return NextResponse.redirect(url);
      }
    }
  } catch {
    if (isHrPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
