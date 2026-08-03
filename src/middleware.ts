import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequiredPermission, hasPermission } from "@/lib/permissions";
import { UserRole } from "@/types";

const AUTH_COOKIE_NAME = "bdja_auth_token";

function getDashboardPath(role: string | null): string {
  switch (role) {
    case "student": return "/student";
    case "parent": return "/parent";
    case "teacher": return "/teacher";
    case "principal":
    case "super_admin": return "/admin";
    case "bursar": return "/bursar";
    case "librarian": return "/librarian";
    default: return "/student";
  }
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

  // ============================================================
  // AUTHENTICATION: Try custom cookie first, fallback to Supabase SSR
  // ============================================================
  let userId: string | null = null;
  let userEmail: string | null = null;

  // 1. Custom cookie (reliable, bypasses @supabase/ssr v0.3.0 bugs)
  const customToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (customToken) {
    try {
      const { data, error } = await supabase.auth.getUser(customToken);
      if (!error && data.user) {
        userId = data.user.id;
        userEmail = data.user.email ?? null;
      }
    } catch {
      // Token invalid — will fall through to standard session check
    }
  }

  // 2. Standard Supabase cookie session (for backward compatibility)
  if (!userId) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        userId = sessionData.session.user.id;
        userEmail = sessionData.session.user.email ?? null;
      }
    } catch {
      // Session check failed
    }
  }

  // ============================================================
  // PUBLIC ROUTES: No auth required
  // ============================================================
  const publicPaths = [
    "/", "/about", "/academics", "/admissions", "/students",
    "/news-events", "/contact", "/notices", "/gallery",
    "/policies", "/faqs", "/downloads", "/calendar",
    "/library", "/help", "/vora",
    "/login", "/reset-password", "/onboarding",
  ];

  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isPublic) {
    // CRITICAL: Never redirect away from /login in middleware.
    // The login page handles client-side redirect for logged-in users.
    // This prevents the ERR_TOO_MANY_REDIRECTS loop.
    return response;
  }

  // ============================================================
  // PROTECTED ROUTES: Must be authenticated
  // ============================================================
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Fetch profile for this user
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, password_changed")
    .eq("id", userId)
    .single();

  // Account suspended
  if (!profile || profile.is_active === false) {
    return NextResponse.redirect(new URL("/login?error=suspended", request.url));
  }

  // Must reset password first
  if (profile.password_changed === false && !pathname.startsWith("/reset-password")) {
    return NextResponse.redirect(new URL("/reset-password?first=true", request.url));
  }

  // Role-based access control
  const requiredPerms = getRequiredPermission(pathname);
  if (requiredPerms && requiredPerms.length > 0) {
    const hasAccess = requiredPerms.some((perm) =>
      hasPermission(profile.role as UserRole, perm as any)
    );
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
