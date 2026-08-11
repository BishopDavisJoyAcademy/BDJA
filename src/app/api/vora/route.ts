import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { voraSearchSchema } from "@/lib/validation";
import { z } from "zod";
import type { Database } from "@/types/database";

type Json = Database["public"]["Tables"]["vora_content"]["Row"]["captions"];
type VoraInsert = Database["public"]["Tables"]["vora_content"]["Insert"];

export const dynamic = "force-dynamic";

function isJson(val: unknown): val is Json {
  if (val === null || typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return true;
  }
  if (Array.isArray(val)) {
    return val.every(isJson);
  }
  if (typeof val === "object" && val !== null) {
    return Object.values(val).every((v) => v === undefined || isJson(v));
  }
  return false;
}

const voraInsertSchema = z.object({
  title: z.string().min(1, "Title is required"),
  video_url: z.string().url("Valid video URL is required"),
  grade_level: z.string().min(1, "Grade level is required"),
  campus_id: z.string().uuid("Valid campus ID is required"),
  subject: z.string().min(1, "Subject is required"),
  description: z.string().nullable().optional(),
  topic: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  is_public: z.boolean().nullable().optional(),
  summary: z.string().nullable().optional(),
  transcript: z.string().nullable().optional(),
  specific_learning_outcome: z.string().nullable().optional(),
  strand: z.string().nullable().optional(),
  sub_strand: z.string().nullable().optional(),
  class_id: z.string().uuid().nullable().optional(),
  subject_id: z.string().uuid().nullable().optional(),
  visibility: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("q") || "";
    const gradeLevel = searchParams.get("grade_level") || "all";
    const subject = searchParams.get("subject") || "";
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    let dbQuery = admin.from("vora_content").select("*");

    if (query) {
      const safeQuery = query.replace(/[%_]/g, "\$&");
      dbQuery = dbQuery.or(`title.ilike.%${safeQuery}%,summary.ilike.%${safeQuery}%,topic.ilike.%${safeQuery}%`);
    }
    if (gradeLevel && gradeLevel !== "all") {
      dbQuery = dbQuery.eq("grade_level", gradeLevel);
    }
    if (subject) {
      dbQuery = dbQuery.eq("subject", subject);
    }
    const { data, error } = await dbQuery.limit(limit).order("created_at", { ascending: false });
    if (error) {
      console.error("[vora GET] Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
    }
    return NextResponse.json({ content: data || [] });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[vora GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const admin = getSupabaseAdmin();
    const rawBody = await req.json();

    const parseResult = voraInsertSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const insertData: VoraInsert = {
      ...parseResult.data,
      uploaded_by: session.userId,
    };
    if (rawBody.captions !== undefined && isJson(rawBody.captions)) {
      insertData.captions = rawBody.captions;
    }

    const { data, error } = await admin
      .from("vora_content")
      .insert(insertData)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[vora POST] Supabase error:", error);
      return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
    }
    return NextResponse.json({ success: true, content: data });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: (error as any).statusCode || 401 });
    }
    console.error("[vora POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
