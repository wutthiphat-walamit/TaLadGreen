import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const PROTECTED_PREFIXES = ["/dashboard", "/savers", "/transactions"];

/**
 * Refresh auth cookies and require a session for protected routes.
 *
 * Important: middleware intentionally does not redirect an authenticated user away
 * from /login. The protected layout checks the staff profile and redirects with a
 * reason; doing both here as well would create an infinite /login <-> /dashboard loop
 * for inactive users or users without a staff_profiles row.
 */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const { url, key, configured } = getSupabaseEnv();
  if (!configured) {
    if (isProtectedRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("reason", "unconfigured");
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Always verify user authenticity against Supabase Auth server via getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
