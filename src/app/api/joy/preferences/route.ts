import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { data, error: dbError } = await admin
      .from("joy_user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (dbError && dbError.code !== "PGRST116") throw dbError;

    if (!data) {
      const { data: created, error: createError } = await admin
        .from("joy_user_preferences")
        .insert({ user_id: user.id })
        .select()
        .maybeSingle();
      if (createError) throw createError;
      return NextResponse.json({ preferences: created });
    }

    return NextResponse.json({ preferences: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const admin = getSupabaseAdmin();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    const { theme, personality_mode, language_preference, show_timestamps, enable_sound, enable_streaming, font_size } = body;

    const update: any = {};
    if (theme !== undefined) update.theme = theme;
    if (personality_mode !== undefined) update.personality_mode = personality_mode;
    if (language_preference !== undefined) update.language_preference = language_preference;
    if (show_timestamps !== undefined) update.show_timestamps = show_timestamps;
    if (enable_sound !== undefined) update.enable_sound = enable_sound;
    if (enable_streaming !== undefined) update.enable_streaming = enable_streaming;
    if (font_size !== undefined) update.font_size = font_size;

    const { data, error: dbError } = await admin
      .from("joy_user_preferences")
      .upsert({ user_id: user.id, ...update }, { onConflict: "user_id" })
      .select()
      .maybeSingle();

    if (dbError) throw dbError;
    return NextResponse.json({ preferences: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
