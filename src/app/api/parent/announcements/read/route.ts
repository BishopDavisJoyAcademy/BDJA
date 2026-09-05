import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage, isAuthError, getErrorStatusCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { announcement_id } = body;

    if (!announcement_id) {
      return NextResponse.json({ error: "announcement_id is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Use raw query to avoid type issues with upsert on new tables
    const { data, error } = await admin
      .from("announcement_reads")
      .insert({
        announcement_id,
        user_id: session.userId,
        read_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      // If duplicate, it's already read - that's fine
      if (error.code === "23505") {
        return NextResponse.json({ success: true });
      }
      console.error("[api/parent/announcements/read] Supabase error:", error);
      return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
    }

    return NextResponse.json({ success: true, read: data });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: getErrorStatusCode(error) || 401 });
    }
    console.error("[api/parent/announcements/read] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
