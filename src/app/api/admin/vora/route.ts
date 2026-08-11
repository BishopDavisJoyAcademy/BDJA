import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { hasPermission } from "@/lib/permissions";

interface VoraAdminProfile {
  user_category: string;
  campus_id: string | null;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: profileRows } = await admin.from("profiles").select("user_category, campus_id").eq("id", user.id).limit(1);
    const profile = (profileRows?.[0] ?? null) as { user_category: string; campus_id: string | null } | null;
    if (!profile || (profile.user_category !== "admin" && !(await hasPermission(user.id, "vora.manage")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: videos, error } = await admin
      .from("vora_content")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    return NextResponse.json({ videos: videos || [] });
  } catch (error: any) {
    console.error("[vora GET] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: profileRows } = await admin.from("profiles").select("user_category, campus_id").eq("id", user.id).limit(1);
    const profile = (profileRows?.[0] ?? null) as { user_category: string; campus_id: string | null } | null;
    if (!profile || (profile.user_category !== "admin" && !(await hasPermission(user.id, "vora.manage")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { error } = await admin.from("vora_content").insert({
      title: body.title,
      description: body.description,
      video_url: body.video_url,
      subject: body.subject,
      grade_level: body.grade_level,
      topic: body.topic,
      duration: body.duration,
      thumbnail_url: body.thumbnail_url,
      is_public: body.is_public ?? true,
      uploaded_by: user.id,
      campus_id: profile?.campus_id || body.campus_id,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[vora POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: profileRows } = await admin.from("profiles").select("user_category, campus_id").eq("id", user.id).limit(1);
    const profile = (profileRows?.[0] ?? null) as { user_category: string; campus_id: string | null } | null;
    if (!profile || (profile.user_category !== "admin" && !(await hasPermission(user.id, "vora.manage")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const body = await req.json();
    const { error } = await admin.from("vora_content").update({
      title: body.title,
      description: body.description,
      video_url: body.video_url,
      subject: body.subject,
      grade_level: body.grade_level,
      topic: body.topic,
      duration: body.duration,
      thumbnail_url: body.thumbnail_url,
      is_public: body.is_public,
    }).eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[vora PUT] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.replace("Bearer ", "");
    const admin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: profileRows } = await admin.from("profiles").select("user_category, campus_id").eq("id", user.id).limit(1);
    const profile = (profileRows?.[0] ?? null) as { user_category: string; campus_id: string | null } | null;
    if (!profile || (profile.user_category !== "admin" && !(await hasPermission(user.id, "vora.manage")))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { error } = await admin.from("vora_content").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[vora DELETE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
