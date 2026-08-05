/**
 * BDJA Middleware v3.0
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequiredPermission, hasPermission } from "@/lib/permissions";
import { UserRole } from "@/types";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const PUBLIC_PATHS = [
  "/", "/about", "/academics", "/admissions", "/students", "/news-events",
  "/contact", "/notices", "/gallery", "/policies", "/faqs", "/downloads",
  "/calendar", "/library", "/help", "/vora", "/login", "/reset-password",
  "/onboarding", "/api/health", "/api/vora/public",
];

const AUTH_PATHS = ["/login", "/reset-password", "/onboarding"];

function getDashboardPath(role: string | null): string {
  switch (role) {
    case "student": return "/student";
    case "parent": return "/parent";
    case "teacher": return "/teacher";
    case "principal":
    case "super_admin": return "/admin";
    case "bursar": return "/bursar";
    case "librarian": return "/librarian";
    case "class_prefect": return "/student";
    default: return "/student";
  }
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
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    }
  );

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const user = claimsData?.claims;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isPublic) return response;

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const admin = getSupabaseAdmin();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, is_active, password_changed, onboarding_completed, full_name, email")
    .eq("id", user.sub)
    .single();

  if (profileError || !profile) {
    console.error(`[middleware] Profile missing for user ${user.sub}. Attempting recovery...`);
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(user.sub);
      if (authUser?.user) {
        const { error: insertError } = await admin.from("profiles").insert({
          id: user.sub,
          email: authUser.user.email || user.email || "",
          full_name: authUser.user.user_metadata?.full_name || "User",
          role: authUser.user.user_metadata?.role || "student",
          campus_id: authUser.user.user_metadata?.campus_id || null,
          is_active: true,
          password_changed: true,
          onboarding_completed: true,
        });
        if (!insertError) {
          console.log(`[middleware] Profile auto-recovered for user ${user.sub}`);
          const { data: newProfile } = await admin
            .from("profiles")
            .select("id, role, is_active, password_changed, onboarding_completed")
            .eq("id", user.sub)
            .single();
          if (newProfile) {
            return handleAuthenticatedUser(request, response, pathname, newProfile, user.sub);
          }
        }
      }
    } catch (recoveryError) {
      console.error("[middleware] Profile recovery failed:", recoveryError);
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "profile_missing");
    loginUrl.searchParams.set("error_detail", "Your account profile is missing. Please contact the administrator.");
    return NextResponse.redirect(loginUrl);
  }

  return handleAuthenticatedUser(request, response, pathname, profile, user.sub);
}

async function handleAuthenticatedUser(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
  profile: any,
  userId: string
): Promise<NextResponse> {
  if (profile.is_active === false) {
    if (pathname.startsWith("/login")) return response;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "suspended");
    loginUrl.searchParams.set("error_detail", "Your account has been suspended. Please contact the administrator.");
    return NextResponse.redirect(loginUrl);
  }

  if (profile.password_changed === false && !pathname.startsWith("/reset-password")) {
    return NextResponse.redirect(new URL("/reset-password?first=true", request.url));
  }

  if (profile.onboarding_completed === false && !pathname.startsWith("/onboarding") && !pathname.startsWith("/reset-password")) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  const requiredPerms = getRequiredPermission(pathname);
  if (requiredPerms && requiredPerms.length > 0) {
    const hasAccess = requiredPerms.some((perm) =>
      hasPermission(profile.role as UserRole, perm as any)
    );
    if (!hasAccess) {
      return NextResponse.redirect(new URL(getDashboardPath(profile.role), request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|.*\.(?:png|jpg|jpeg|svg|ico|css|js|json|woff|woff2|ttf|eot|webp|avif)$).*)",
  ],
};
