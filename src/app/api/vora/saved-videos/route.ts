import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getSupabaseAdmin } from "@/lib/supabase-server";
import { saveVideoSchema } from "@/lib/validation";
import { rateLimit, getClientIdentifier } from "@/lib/rate-limiter";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const identifier = getClientIdentifier(req) + ":saved-videos";
    const { success } = await rateLimit(identifier, { limit: 60, windowMs: 60000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("saved_videos")
      .select("*")
      .eq("user_id", session.user.id)
      .order("saved_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ videos: data || [] });
  } catch (error: any) {
    console.error("Saved videos GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identifier = getClientIdentifier(req) + ":save-video";
    const { success } = await rateLimit(identifier, { limit: 20, windowMs: 60000 });
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = saveVideoSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input", details: parseResult.error.flatten() }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin().from("saved_videos").insert({
      user_id: session.user.id,
      ...parseResult.data,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Video already saved" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, message: "Video saved" });
  } catch (error: any) {
    console.error("Save video error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin()
      .from("saved_videos")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Video removed" });
  } catch (error: any) {
    console.error("Delete saved video error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
