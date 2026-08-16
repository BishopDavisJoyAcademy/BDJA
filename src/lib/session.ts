import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { AuthRequiredError, PermissionDeniedError } from "./errors";

export interface ValidatedSession {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  campusId: string | null;
  userCategory: string | null;
}

export async function requireAuth(req: NextRequest): Promise<ValidatedSession> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new AuthRequiredError("Authentication required");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, campus_id, user_category, is_active")
    .eq("id", session.user.id)
    .single();

  if (!profile || !profile.is_active) {
    throw new AuthRequiredError("Account inactive or not found");
  }

  const { data: permData } = await supabase
    .from("staff_permissions")
    .select("permissions(permission_key)")
    .eq("staff_id", profile.id);

  const permissions = (permData || [])
    .map((p: { permissions: { permission_key: string } | null }) => p.permissions?.permission_key)
    .filter((k): k is string => Boolean(k));

  return {
    userId: profile.id,
    email: profile.email,
    role: profile.role,
    permissions,
    campusId: profile.campus_id,
    userCategory: profile.user_category,
  };
}

export function requirePermission(
  session: ValidatedSession,
  permission: string
): void {
  if (!session.permissions.includes(permission)) {
    throw new PermissionDeniedError(`Permission '${permission}' required`);
  }
}

export function requireAnyPermission(
  session: ValidatedSession,
  permissions: string[]
): void {
  const hasAny = permissions.some((p) => session.permissions.includes(p));
  if (!hasAny) {
    throw new PermissionDeniedError(
      `One of [${permissions.join(", ")}] permissions required`
    );
  }
}
