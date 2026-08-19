import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { restoreMissingProfile } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || "Invalid credentials" }, { status: 401 });
    }

    const restored = await restoreMissingProfile(data.user.id, data.user.email || "");

    const admin = getSupabaseAdmin();
    const { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("password_changed, role, user_category, is_active")
      .eq("id", data.user.id)
      .limit(1);

    const profile = profileRows?.[0] ?? null;

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Account not found" }, { status: 403 });
    }

    if (profile.is_active === false) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      mustChangePassword: !profile.password_changed,
      role: profile.role,
      userCategory: profile.user_category,
      restored,
    });
  } catch (err: unknown) {
    console.error("[login] Error:", getErrorMessage(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
