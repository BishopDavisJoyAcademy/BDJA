import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { admission_number, pin } = body;

    if (!admission_number || !pin) {
      return NextResponse.json(
        { error: "Admission number and PIN are required" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // Look up student by admission number
    const { data: student, error: studentError } = await admin
      .from("students")
      .select("id, admission_number, profiles(id, email)")
      .eq("admission_number", admission_number)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Invalid admission number or PIN" },
        { status: 401 }
      );
    }

    const email = (student as any).profiles?.email;
    if (!email) {
      return NextResponse.json(
        { error: "Student account not properly configured" },
        { status: 500 }
      );
    }

    // Sign in with email + PIN
    const { data: authData, error: authError } = await admin.auth.signInWithPassword({
      email,
      password: pin,
    });

    if (authError || !authData.session) {
      return NextResponse.json(
        { error: "Invalid admission number or PIN" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      },
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    });
  } catch (error: any) {
    console.error("[student-login] Error:", error);
    return NextResponse.json(
      { error: error.message || "Login failed" },
      { status: 500 }
    );
  }
}
