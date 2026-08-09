/**
 * BDJA Middleware v6.0 — Bulletproof Auth Flow
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { checkRoutePermission } from "@/lib/permissions";

const PUBLIC_PATHS = [
  "/", "/about", "/academics", "/admissions", "/students", "/news-events",
  "/contact", "/notices", "/gallery", "/policies", "/faqs", "/downloads",
  "/calendar", "/library", "/help", "/vora", "/login", "/reset-password",
  "/onboarding", "/api/health", "/api/vora/public",
];

const AUTH_PATHS = ["/login", "/reset-password", "/onboarding"];

function getDashboardPath(userCategory: string | null): string {
  if (userCategory === "student") return "/student";
  if (userCategory === "parent") return "/parent";
  if (userCategory === "staff") return "/teacher";
  if (userCategory === "admin") return "/admin";
  return "/student";
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    /\.(?:png|jpg|jpeg|svg|ico|css|js|json|woff|woff2|ttf|eot|webp|avif)$/.test(pathname)
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) return response;

  // No session → redirect to login
  if (userError || !user) {
    if (isAuthPath) return response;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Has session → check profile
  const admin = getSupabaseAdmin();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, user_category, is_active, password_changed, onboarding_completed, full_name, email")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "profile_missing");
    return NextResponse.redirect(loginUrl);
  }

  // Account disabled
  if (profile.is_active === false) {
    await supabase.auth.signOut();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "suspended");
    return NextResponse.redirect(loginUrl);
  }

  // Must change password (first login)
  if (profile.password_changed === false && !pathname.startsWith("/reset-password")) {
    return NextResponse.redirect(new URL("/reset-password?first=true", request.url));
  }

  // Must complete onboarding
  if (profile.onboarding_completed === false && !pathname.startsWith("/onboarding") && !pathname.startsWith("/reset-password")) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Already authenticated trying to access auth pages → redirect to dashboard
  if (isAuthPath && profile.password_changed === true && profile.onboarding_completed === true) {
    return NextResponse.redirect(new URL(getDashboardPath(profile.user_category), request.url));
  }

  // Route permission check
  if (!pathname.startsWith("/api/")) {
    const hasAccess = await checkRoutePermission(user.id, pathname, profile.user_category);
    if (!hasAccess) {
      return NextResponse.redirect(new URL(getDashboardPath(profile.user_category), request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|.*\.(?:png|jpg|jpeg|svg|ico|css|js|json|woff|woff2|ttf|eot|webp|avif)$).*)",
  ],
};
