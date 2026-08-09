import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/contact",
  "/about",
  "/academics",
  "/admissions",
  "/news-events",
  "/notices",
  "/downloads",
  "/library",
  "/vora",
  "/help",
  "/api/auth/student-login",
  "/api/auth/first-login",
  "/api/auth/change-password",
  "/api/auth/me",
  "/api/auth/permissions",
  "/api/auth/onboarding",
  "/api/health",
];

const STATIC_ASSETS = ["/_next", "/static", "/favicon.ico", "/logo", "/images"];

// Admin route segment from env (obfuscated)
const ADMIN_SEGMENT = process.env.NEXT_PUBLIC_ADMIN_SEGMENT || "admin";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets
  if (STATIC_ASSETS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Public routes
  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Use getUser() for secure validation
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_category, password_changed, onboarding_completed, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Account suspended
  if (profile.is_active === false) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=account_suspended", req.url));
  }

  // First login — must set password/PIN
  if (profile.password_changed === false) {
    const type = profile.user_category === "student" ? "student" : "staff";
    const resetUrl = new URL("/reset-password", req.url);
    resetUrl.searchParams.set("first", "true");
    resetUrl.searchParams.set("type", type);
    return NextResponse.redirect(resetUrl);
  }

  // Onboarding not completed
  if (profile.onboarding_completed === false) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Route access control
  const category = profile.user_category;

  // Admin routes (obfuscated)
  if (pathname.startsWith(`/${ADMIN_SEGMENT}/`)) {
    if (category !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    return res;
  }

  // Student routes
  if (pathname.startsWith("/student/") || pathname === "/student") {
    if (category !== "student" && category !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    return res;
  }

  // Parent routes
  if (pathname.startsWith("/parent/") || pathname === "/parent") {
    if (category !== "parent" && category !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    return res;
  }

  // Staff/Teacher routes
  if (pathname.startsWith("/teacher/") || pathname === "/teacher") {
    if (category !== "staff" && category !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    return res;
  }

  // Bursar routes
  if (pathname.startsWith("/bursar/") || pathname === "/bursar") {
    if (category !== "staff" && category !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    return res;
  }

  // Librarian routes
  if (pathname.startsWith("/librarian/") || pathname === "/librarian") {
    if (category !== "staff" && category !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    return res;
  }

  // Dashboard root redirects
  if (pathname === "/dashboard") {
    if (category === "admin") return NextResponse.redirect(new URL(`/${ADMIN_SEGMENT}`, req.url));
    if (category === "student") return NextResponse.redirect(new URL("/student", req.url));
    if (category === "parent") return NextResponse.redirect(new URL("/parent", req.url));
    if (category === "staff") return NextResponse.redirect(new URL("/teacher", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
