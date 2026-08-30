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
  console.info("[UPLOAD-STEP-1] Request received");
  try {
    console.info("[UPLOAD-STEP-2] Calling requireAuth");
    const session = await requireAuth(req);
    console.info("[UPLOAD-STEP-3] Auth passed:", session.userId);

    console.info("[UPLOAD-STEP-4] Checking rate limit");
    const identifier = getClientIP(req) + ":upload";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.upload);
    if (!rateOk) {
      console.info("[UPLOAD-STEP-5] Rate limit exceeded");
      return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
    }
    console.info("[UPLOAD-STEP-6] Rate limit OK");

    console.info("[UPLOAD-STEP-7] Parsing formData");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";
    console.info("[UPLOAD-STEP-8] File:", file ? file.name : "null", "Type:", file?.type, "Size:", file?.size);

    if (!file) {
      console.info("[UPLOAD-STEP-9] No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      console.info("[UPLOAD-STEP-10] File too large:", file.size);
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      console.info("[UPLOAD-STEP-11] File type not allowed:", file.type);
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "bin";
    const safeName = `${Date.now()}_${session.userId.slice(0, 8)}.${ext}`;
    const path = `${folder}/${safeName}`;
    console.info("[UPLOAD-STEP-12] Target path:", path);

    console.info("[UPLOAD-STEP-13] Converting to Buffer");
    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      console.info("[UPLOAD-STEP-14] ArrayBuffer received, length:", arrayBuffer.byteLength);
      buffer = Buffer.from(arrayBuffer);
      console.info("[UPLOAD-STEP-15] Buffer created, length:", buffer.length);
    } catch (bufErr) {
      console.error("[UPLOAD-STEP-16] Buffer conversion failed:", bufErr);
      return NextResponse.json(
        { error: "Failed to read file: " + getErrorMessage(bufErr) },
        { status: 500 }
      );
    }

    const admin = getSupabaseAdmin();

    console.info("[UPLOAD-STEP-17] Listing storage buckets");
    const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
    if (bucketError) {
      console.error("[UPLOAD-STEP-18] Bucket list failed:", bucketError);
      return NextResponse.json(
        { error: "Storage unavailable: " + bucketError.message },
        { status: 500 }
      );
    }
    const bucketExists = buckets?.some((b) => b.name === "bdja-uploads");
    console.info("[UPLOAD-STEP-19] Bucket exists:", bucketExists);
    if (!bucketExists) {
      console.error("[UPLOAD-STEP-20] Bucket missing. Available:", buckets?.map((b) => b.name));
      return NextResponse.json(
        { error: "Storage bucket 'bdja-uploads' not found." },
        { status: 500 }
      );
    }

    console.info("[UPLOAD-STEP-21] Uploading to storage");
    const { data, error } = await admin.storage
      .from("bdja-uploads")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (error) {
      console.error("[UPLOAD-STEP-22] Storage upload error:", JSON.stringify(error));
      return NextResponse.json(
        { error: "Upload failed: " + error.message, code: error.name || "STORAGE_ERROR" },
        { status: 500 }
      );
    }
    console.info("[UPLOAD-STEP-23] Upload success");

    console.info("[UPLOAD-STEP-24] Getting public URL");
    const { data: urlData } = admin.storage.from("bdja-uploads").getPublicUrl(path);
    console.info("[UPLOAD-STEP-25] Public URL:", urlData.publicUrl);

    console.info("[UPLOAD-STEP-26] Returning success");
    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: unknown) {
    console.error("[UPLOAD-CATCH] Error type:", error?.constructor?.name);
    console.error("[UPLOAD-CATCH] Error message:", getErrorMessage(error));
    console.error("[UPLOAD-CATCH] Full error:", error);
    if (isAuthError(error)) {
      console.info("[UPLOAD-CATCH] Auth error detected, returning 401");
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 401 });
    }
    console.error("[UPLOAD-CATCH] Non-auth error, returning 500");
    return NextResponse.json(
      { error: "Upload failed: " + getErrorMessage(error), type: error?.constructor?.name },
      { status: 500 }
    );
  }
}
