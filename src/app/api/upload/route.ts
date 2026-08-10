import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIP } from "@/lib/security";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const identifier = getClientIP(req) + ":upload";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.upload);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "bin";
    const safeName = `${Date.now()}_${session.userId.slice(0, 8)}.${ext}`;
    const path = `${folder}/${safeName}`;

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.storage
      .from("bdja-uploads")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = admin.storage.from("bdja-uploads").getPublicUrl(path);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    if (error.name === "AuthRequiredError") {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    console.error("[upload] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
