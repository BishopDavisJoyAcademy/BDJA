import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequiredPermission, hasPermission } from "@/lib/permissions";
import { UserRole } from "@/types";

function getDashboardPath(role: string | null): string {
  if (role === "student") return "/student";
  if (role === "parent") return "/parent";
  if (role === "teacher") return "/teacher";
  if (role === "principal" || role === "super_admin") return "/admin";
  if (role === "bursar") return "/bursar";
  if (role === "librarian") return "/librarian";
  return "/student";
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const pathname = request.nextUrl.pathname;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) { return request.cookies.get(name)?.value; },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  let session = null;
  let user = null;

  // REAL FIX: @supabase/ssr v0.3.0 silently fails to write auth cookies when
  // the JWT exceeds 4KB. The server cookie jar is empty, so getSession()
  // returns null even though the user is logged in.
  // We use a custom cookie (bdja_auth_token) set by the login page, and
  // validate it with supabase.auth.getUser(token) which works over HTTP.
  const customToken = request.cookies.get("bdja_auth_token")?.value;
  if (customToken) {
    try {
      const { data, error } = await supabase.auth.getUser(customToken);
      if (!error && data.user) {
        user = data.user;
        console.log("[middleware] Authenticated via custom cookie for user:", user.id);
      }
    } catch (e) {
      console.error("[middleware] Custom token validation failed:", e);
    }
  }

  // Fallback to standard cookie-based session
  if (!user) {
    const { data: sessionData } = await supabase.auth.getSession();
    session = sessionData.session;
    if (session?.user) {
      user = session.user;
      console.log("[middleware] Authenticated via standard cookie for user:", user.id);
    }
  }

  // Public pages - no auth required
  const publicPaths = [
    "/", "/about", "/academics", "/admissions", "/students",
    "/news-events", "/contact", "/notices", "/gallery",
    "/policies", "/faqs", "/downloads", "/calendar",
    "/library", "/help", "/vora",
    "/login", "/reset-password", "/onboarding",
  ];

  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isPublic) {
    // REAL FIX: Do NOT redirect away from /login in middleware.
    // The login page handles client-side redirect for logged-in users.
    // This prevents the ERR_TOO_MANY_REDIRECTS loop caused by middleware
    // and client-side redirects fighting each other.
    return response;
  }

  // Not logged in -> redirect to login
  if (!user) {
    console.log("[middleware] No auth on protected route:", pathname);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, password_changed")
    .eq("id", user.id)
    .single();

  if (!profile || profile.is_active === false) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=suspended", request.url));
  }

  if (profile.password_changed === false && !pathname.startsWith("/reset-password")) {
    return NextResponse.redirect(new URL("/reset-password?first=true", request.url));
  }

  // Role-based route protection
  const requiredPerms = getRequiredPermission(pathname);
  if (requiredPerms && requiredPerms.length > 0) {
    const hasAccess = requiredPerms.some(perm => hasPermission(profile.role as UserRole, perm as any));
    if (!hasAccess) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|css|js|json|woff|woff2|ttf|eot)$).*)",
  ],
};
