import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { firstLoginPasswordSchema } from "@/lib/validation";
import { hashPassword, addPasswordToHistory } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = firstLoginPasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
    }

    const { new_password } = parseResult.data;
    const passwordHash = await hashPassword(new_password);

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        password_changed: true,
        onboarding_completed: true,
        temp_password_hash: null,
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    await addPasswordToHistory(user.id, passwordHash);

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(user.id, {
      password: new_password,
    });
    if (authUpdateError) {
      console.error("[onboarding] Auth password update failed:", authUpdateError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api/auth/onboarding] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
