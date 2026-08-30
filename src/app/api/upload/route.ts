import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, isAuthError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    console.log("[upload] Auth passed:", session.userId);

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

    // Convert File to Buffer — more reliable than ArrayBuffer in Node.js runtime
    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (bufErr) {
      console.error("[upload] Buffer conversion failed:", bufErr);
      return NextResponse.json(
        { error: "Failed to read file: " + getErrorMessage(bufErr) },
        { status: 500 }
      );
    }

    const admin = getSupabaseAdmin();

    // Verify bucket exists before upload
    const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
    if (bucketError) {
      console.error("[upload] Failed to list buckets:", bucketError);
      return NextResponse.json(
        { error: "Storage unavailable: " + bucketError.message },
        { status: 500 }
      );
    }
    const bucketExists = buckets?.some((b) => b.name === "bdja-uploads");
    if (!bucketExists) {
      console.error("[upload] Bucket 'bdja-uploads' not found. Available:", buckets?.map((b) => b.name));
      return NextResponse.json(
        { error: "Storage bucket 'bdja-uploads' not found. Run migration 006_storage_bucket.sql in Supabase." },
        { status: 500 }
      );
    }

    const { data, error } = await admin.storage
      .from("bdja-uploads")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (error) {
      console.error("[upload] Storage upload error:", error);
      return NextResponse.json(
        { error: "Upload failed: " + error.message },
        { status: 500 }
      );
    }

    const { data: urlData } = admin.storage.from("bdja-uploads").getPublicUrl(path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 401 });
    }
    console.error("[upload] Unhandled error:", error);
    return NextResponse.json(
      { error: "Upload failed: " + getErrorMessage(error) },
      { status: 500 }
    );
  }
}
