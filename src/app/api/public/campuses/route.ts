import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();

    // Try with is_active filter first
    let result = await admin
      .from("campuses")
      .select("id, name, location, address, email, phone, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    // If is_active column doesn't exist yet, fallback to query without it
    if (result.error && result.error.message.includes("is_active")) {
      console.warn("[public/campuses] is_active column not found, falling back to unfiltered query");
      result = await admin
        .from("campuses")
        .select("id, name, location, address, email, phone")
        .order("name", { ascending: true });
    }

    if (result.error) {
      console.error("[public/campuses GET] Supabase error:", result.error.message);
      return NextResponse.json(
        { error: "Failed to fetch campuses", details: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ campuses: result.data || [] });
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error("[public/campuses GET] Exception:", msg);
    return NextResponse.json(
      { error: "Internal server error", details: msg },
      { status: 500 }
    );
  }
}
