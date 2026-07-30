import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequiredPermission, hasPermission } from "@/lib/permissions";
import { UserRole } from "@/types";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const pathname = request.nextUrl.pathname;
  const publicPaths = ["/login", "/reset-password", "/onboarding", "/api/onboarding/setup-super-admin"];

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // Not logged in -> redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check if user is active and get role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active, password_changed")
    .eq("id", session.user.id)
    .single();

  // Account suspended or not found
  if (!profile || profile.is_active === false) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=suspended", request.url));
  }

  // Force password change on first login
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|logo|.*\.png|.*\.jpg|.*\.svg|.*\.css|.*\.js).*)"],
};
