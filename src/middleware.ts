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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

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
    // REAL FIX: When a logged-in user hits /login, redirect them to their
    // role-appropriate dashboard instead of hardcoding /student.
    if (session && pathname === "/login") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      const dashboard = getDashboardPath(profile?.role as string | null);
      return NextResponse.redirect(new URL(dashboard, request.url));
    }
    return response;
  }

  // Not logged in -> redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, password_changed")
    .eq("id", session.user.id)
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

// CRITICAL: Exclude API routes from middleware entirely.
// This prevents the session refresh race condition where middleware
// invalidates the refresh token before the API route can use it.
export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|css|js|json|woff|woff2|ttf|eot)$).*)",
  ],
};
