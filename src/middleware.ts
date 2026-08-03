import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequiredPermission, hasPermission } from "@/lib/permissions";
import { UserRole } from "@/types";

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
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value)
          );
        },
      },
    }
  );

  // CRITICAL: Call getClaims() to refresh session and sync cookies.
  // Do NOT run code between createServerClient and getClaims().
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;

  // Public pages — no auth required
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
    // If logged-in user hits /login, let the login page handle redirect.
    // Do NOT redirect here to avoid loop.
    return response;
  }

  // Protected route but no user — redirect to login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Fetch profile for state checks and role-based access
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, password_changed")
    .eq("id", user.sub)
    .single();

  if (!profile || profile.is_active === false) {
    return NextResponse.redirect(new URL("/login?error=suspended", request.url));
  }

  if (profile.password_changed === false && !pathname.startsWith("/reset-password")) {
    return NextResponse.redirect(new URL("/reset-password?first=true", request.url));
  }

  // Role-based route protection
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
