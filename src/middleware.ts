import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { ADMIN_SEGMENT } from "@/lib/constants";

// Public paths that do not require authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/about",
  "/academics",
  "/admissions",
  "/contact",
  "/students",
  "/library",
  "/news-events",
  "/downloads",
  "/help",
  "/notices",
  "/vora",
  "/reset-password",
  "/onboarding",
  "/unauthorized",
  "/api/auth/login",
  "/api/auth/student-login",
  "/api/auth/refresh",
  "/api/health",
  "/api/vora/public",
  "/api/onboarding",
];

const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/auth/student-login",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/vora/public",
  "/api/onboarding",
];

const PASSWORD_CHANGE_APIS = [
  "/api/auth/first-login",
  "/api/auth/change-password",
  "/api/auth/logout",
  "/api/auth/me",
];

const ONBOARDING_APIS = [
  "/api/auth/onboarding",
  "/api/auth/logout",
  "/api/auth/me",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and API prefixes without auth
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    // If authenticated user visits login, redirect to dashboard
    if (pathname === "/login") {
      const previewClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return req.cookies.getAll(); },
            setAll() {},
          },
        }
      );
      const { data: { user: previewUser } } = await previewClient.auth.getUser();
      if (previewUser) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    return NextResponse.next();
  }

  // Initialize Supabase SSR client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session — redirect or 401
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Use admin client to bypass RLS for profile lookup in middleware
  const admin = getSupabaseAdmin();
  const { data: profileRows, error: profileError } = await admin
    .from("profiles")
    .select("user_category, password_changed, onboarding_completed, is_active")
    .eq("id", user.id)
    .limit(1);
  const profile = (profileRows?.[0] ?? null) as {
    user_category: string;
    password_changed: boolean;
    onboarding_completed: boolean;
    is_active: boolean;
  } | null;

  if (profileError || !profile) {
    console.error("[middleware] Profile missing for user:", user.id, "error:", profileError?.message);
    await supabase.auth.signOut();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Profile missing" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Account suspended
  if (profile.is_active === false) {
    await supabase.auth.signOut();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/login?error=account_suspended", req.url));
  }

  // First login — must set password/PIN
  if (profile.password_changed === false) {
    if (
      pathname === "/reset-password" ||
      pathname.startsWith("/reset-password/") ||
      PASSWORD_CHANGE_APIS.some((p) => pathname === p || pathname.startsWith(p + "/"))
    ) {
      return NextResponse.next();
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
    if (
      pathname === "/onboarding" ||
      pathname.startsWith("/onboarding/") ||
      ONBOARDING_APIS.some((p) => pathname === p || pathname.startsWith(p + "/"))
    ) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Onboarding required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  const category = profile.user_category;

  // Admin routes
  const internalPathname = req.nextUrl.pathname;
  if (internalPathname.startsWith(`/${ADMIN_SEGMENT}/`) || internalPathname === `/${ADMIN_SEGMENT}`) {
    if (category !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // Student routes
  if (pathname.startsWith("/student/")) {
    if (category !== "student") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // Parent routes
  if (pathname.startsWith("/parent/")) {
    if (category !== "parent") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // Teacher/Staff routes
  if (pathname.startsWith("/teacher/") || pathname.startsWith("/staff/")) {
    if (category !== "staff" && category !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
