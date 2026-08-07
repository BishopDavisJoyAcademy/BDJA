import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { rateLimit, RATE_LIMITS, getClientIdentifier } from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

    const { data: suggestions, error } = await admin
      .from("suggestions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }

    return NextResponse.json({ suggestions: suggestions || [] });
  } catch (error: any) {
    console.error("[api/suggestions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identifier = getClientIdentifier(req) + ":suggestions";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.suggestions);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many suggestions. Please try again later." }, { status: 429 });
    }

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
    const { type, title, description } = body;

    if (!type || !title || !description) {
      return NextResponse.json({ error: "Type, title, and description are required" }, { status: 400 });
    }

    if (!["idea", "feedback", "bug", "improvement", "complaint"].includes(type)) {
      return NextResponse.json({ error: "Invalid suggestion type" }, { status: 400 });
    }

    if (title.length > 200 || description.length > 5000) {
      return NextResponse.json({ error: "Title or description too long" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("suggestions")
      .insert({
        user_id: user.id,
        type,
        title: title.trim(),
        description: description.trim(),
        status: "open",
        priority: "medium",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to submit suggestion" }, { status: 500 });
    }

    return NextResponse.json({ success: true, suggestion: data });
  } catch (error: any) {
    console.error("[api/suggestions] POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
