import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequiredPermission, hasPermission } from "@/lib/permissions";
import { UserRole } from "@/types";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── 1. STATIC ASSETS — bypass everything ──
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/health") ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|json|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  // ── 2. API ROUTES — bypass session refresh to avoid token-invalidation race ──
  // API routes handle their own auth. If middleware refreshes the session here,
  // the old refresh token becomes invalid, and the API route can't getSession().
  if (pathname.startsWith("/api/")) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  // ── 3. PUBLIC PAGES — no auth required ──
  const publicPaths = [
    "/", "/about", "/academics", "/admissions", "/students",
    "/news-events", "/contact", "/notices", "/gallery",
    "/policies", "/faqs", "/downloads", "/calendar",
    "/library", "/help", "/vora",
    "/login", "/reset-password", "/onboarding",
  ];

  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Create response once and reuse it
  let response = NextResponse.next({ request: { headers: request.headers } });

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

  if (isPublic) {
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/student", request.url));
    }
    return response;
  }

  // ── 4. PROTECTED ROUTES — require auth ──
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

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\.(?:png|jpg|jpeg|svg|ico|css|js|json|woff|woff2|ttf|eot)$).*)"],
};
