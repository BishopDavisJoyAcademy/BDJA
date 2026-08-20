import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    const { data, error: dbError } = await admin
      .from("joy_user_preferences")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (dbError && dbError.code !== "PGRST116") throw dbError;

    if (!data) {
      const defaults = {
        user_id: session.user.id,
        theme: "light",
        personality_mode: "auto",
        language_preference: "auto",
        font_size: "medium",
        show_timestamps: true,
        enable_sound: true,
        enable_streaming: true,
      };
      const { data: created, error: createError } = await admin
        .from("joy_user_preferences")
        .insert(defaults)
        .select()
        .maybeSingle();
      if (createError) throw createError;
      return NextResponse.json({ preferences: created });
    }

    return NextResponse.json({ preferences: data });
  } catch (error: any) {
    console.error("[joy/preferences GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load preferences" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const body = await req.json();

    const {
      theme,
      personality_mode,
      language_preference,
      show_timestamps,
      enable_sound,
      enable_streaming,
      font_size,
    } = body;

    const update: Record<string, any> = {};
    if (theme !== undefined) update.theme = theme;
    if (personality_mode !== undefined) update.personality_mode = personality_mode;
    if (language_preference !== undefined) update.language_preference = language_preference;
    if (show_timestamps !== undefined) update.show_timestamps = show_timestamps;
    if (enable_sound !== undefined) update.enable_sound = enable_sound;
    if (enable_streaming !== undefined) update.enable_streaming = enable_streaming;
    if (font_size !== undefined) update.font_size = font_size;

    const { data, error: dbError } = await admin
      .from("joy_user_preferences")
      .upsert(
        {
          user_id: session.user.id,
          ...update,
        },
        { onConflict: "user_id" }
      )
      .select()
      .maybeSingle();

    if (dbError) throw dbError;
    return NextResponse.json({ preferences: data });
  } catch (error: any) {
    console.error("[joy/preferences POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save preferences" }, { status: 500 });
  }
}
