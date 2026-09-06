import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/session";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();

    const { data, error: dbError } = await admin
      .from("joy_user_preferences")
      .select("*")
      .eq("user_id", session.userId)
      .maybeSingle();

    if (dbError && dbError.code !== "PGRST116") throw dbError;

    if (!data) {
      const defaults = {
        user_id: session.userId,
        theme: "gold",
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load preferences";
    console.error("[joy/preferences GET] Error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
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

    // Fetch existing to merge defaults
    const { data: existing } = await admin
      .from("joy_user_preferences")
      .select("*")
      .eq("user_id", session.userId)
      .maybeSingle();

    const upsertData = {
      user_id: session.userId,
      theme: theme ?? existing?.theme ?? "gold",
      personality_mode: personality_mode ?? existing?.personality_mode ?? "auto",
      language_preference: language_preference ?? existing?.language_preference ?? "auto",
      font_size: font_size ?? existing?.font_size ?? "medium",
      show_timestamps: show_timestamps ?? existing?.show_timestamps ?? true,
      enable_sound: enable_sound ?? existing?.enable_sound ?? true,
      enable_streaming: enable_streaming ?? existing?.enable_streaming ?? true,
    };

    // FIX: Use update+insert fallback instead of upsert (missing unique constraint)
    let result;
    if (existing) {
      const { data, error: dbError } = await admin
        .from("joy_user_preferences")
        .update(upsertData)
        .eq("user_id", session.userId)
        .select()
        .maybeSingle();
      if (dbError) throw dbError;
      result = data;
    } else {
      const { data, error: dbError } = await admin
        .from("joy_user_preferences")
        .insert(upsertData)
        .select()
        .maybeSingle();
      if (dbError) throw dbError;
      result = data;
    }

    return NextResponse.json({ preferences: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to save preferences";
    console.error("[joy/preferences POST] Error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
