import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const PUBLIC_PAGES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/contact",
  "/contacts",
  "/about",
  "/academics",
  "/admissions",
  "/news-events",
  "/notices",
  "/downloads",
  "/library",
  "/vora",
  "/help",
  "/faqs",
  "/gallery",
  "/policies",
  "/calendar",
  "/students",
];

const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/auth/student-login",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/vora/public",
  "/api/onboarding",
  "/api/pages/public",
];

const STATIC_ASSETS = ["/_next", "/static", "/favicon.ico", "/logo", "/images", "/grades", "/slides", "/manifest.json"];

const ADMIN_SEGMENT = process.env.NEXT_PUBLIC_ADMIN_SEGMENT;
if (!ADMIN_SEGMENT) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_ADMIN_SEGMENT");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets
  if (STATIC_ASSETS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Public pages
  if (PUBLIC_PAGES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return NextResponse.next();
  }

  // Public API prefixes
  if (PUBLIC_API_PREFIXES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // ============================================
  // ADMIN SEGMENT OBSCURITY
  // ============================================
  // If someone hits the raw /admin path but segment is different, block it
  if (ADMIN_SEGMENT !== "admin" && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Rewrite obscured admin pages to internal /admin/*
  if (pathname === `/${ADMIN_SEGMENT}` || pathname.startsWith(`/${ADMIN_SEGMENT}/`)) {
    const internalPath = pathname.replace(`/${ADMIN_SEGMENT}`, "/admin");
    const url = req.nextUrl.clone();
    url.pathname = internalPath;
    // Continue with auth checks below on the rewritten path
    req = new NextRequest(url, req);
  }

  // Rewrite obscured admin API to internal /api/admin/*
  if (pathname.startsWith(`/api/${ADMIN_SEGMENT}/`)) {
    const internalPath = pathname.replace(`/api/${ADMIN_SEGMENT}`, "/api/admin");
    const url = req.nextUrl.clone();
    url.pathname = internalPath;
    req = new NextRequest(url, req);
  }

  let res = NextResponse.next({ request: req });

  // Create Supabase server client with getAll/setAll (SSR 0.5.x API)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Secure validation using getUser()
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  interface MiddlewareProfile {
    user_category: string;
    password_changed: boolean;
    onboarding_completed: boolean;
    is_active: boolean | null;
  }

  // Fetch profile using admin client to bypass RLS (middleware anon client is subject to RLS)
  const admin = getSupabaseAdmin();
  const { data: profileRows, error: profileError } = await admin
    .from("profiles")
    .select("user_category, password_changed, onboarding_completed, is_active")
    .eq("id", user.id)
    .limit(1);
  const profile = (profileRows?.[0] ?? null) as MiddlewareProfile | null;

  if (profileError || !profile) {
    console.error("[middleware] Profile missing for user:", user.id, "error:", profileError?.message);
    await supabase.auth.signOut();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Profile missing" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Account suspended — only explicit false means inactive
  if (profile.is_active === false) {
    await supabase.auth.signOut();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/login?error=account_suspended", req.url));
  }

  // First login — must set password/PIN
  if (profile.password_changed === false) {
    // Allow reset-password page and the API endpoints that perform the actual password change
    const allowedPaths = [
      "/reset-password",
      "/api/auth/first-login",
      "/api/auth/change-password",
    ];
    if (allowedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return res;
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Password change required" }, { status: 403 });
    }
    const type = profile.user_category === "student" ? "student" : "staff";
    const resetUrl = new URL("/reset-password", req.url);
    resetUrl.searchParams.set("first", "true");
    resetUrl.searchParams.set("type", type);
    return NextResponse.redirect(resetUrl);
  }

  // Onboarding not completed
  if (profile.onboarding_completed === false) {
    if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
      return res;
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Onboarding required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  const category = profile.user_category;

  // Admin routes (internal path after rewrite is /admin/*)
  const internalPathname = req.nextUrl.pathname;
  if (internalPathname.startsWith("/admin/") || internalPathname === "/admin") {
    if (category !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    return res;
  }

  // Student routes
  if (internalPathname.startsWith("/student/") || internalPathname === "/student") {
    if (category !== "student" && category !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    return res;
  }

  // Parent routes
  if (internalPathname.startsWith("/parent/") || internalPathname === "/parent") {
    if (category !== "parent" && category !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    return res;
  }

  // Teacher/Staff routes
  if (internalPathname.startsWith("/teacher/") || internalPathname === "/teacher") {
    if (category !== "staff" && category !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    return res;
  }

  // Dashboard root redirects
  if (internalPathname === "/dashboard") {
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
