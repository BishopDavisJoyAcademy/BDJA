import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("campuses")
      .select("id, name, location, address, email, phone")
      .order("name", { ascending: true });

    if (error) {
      console.error("[public/campuses GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch campuses" }, { status: 500 });
    }

    return NextResponse.json({ campuses: data || [] });
  } catch (err: unknown) {
    console.error("[public/campuses GET] Exception:", getErrorMessage(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
