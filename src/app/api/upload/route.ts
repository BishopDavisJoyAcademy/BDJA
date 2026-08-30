import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { createClient } from "@/lib/supabase-client";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIP } from "@/lib/security";
import { getErrorMessage, isAuthError, AuthRequiredError } from "@/lib/errors";
import { ValidatedSession, UserRole, UserCategory } from "@/types";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_FOLDERS = [
  "uploads",
  "avatars",
  "documents",
  "gallery",
  "assignments",
  "notices",
];

async function getSessionFromRequest(req: NextRequest): Promise<ValidatedSession | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (token) {
    const { session, error } = await validateSession(token);
    if (session && !error) return session;
    console.warn("[upload] Header token invalid, trying cookie fallback. Error:", error?.message);
  }

  try {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("[upload] Cookie auth failed:", userError?.message);
      return null;
    }

    const admin = getSupabaseAdmin();
    const { data: profileRows, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name, role, user_category, campus_id, is_active, password_changed, onboarding_completed")
      .eq("id", user.id)
      .limit(1);

    if (profileError || !profileRows || profileRows.length === 0) {
      console.warn("[upload] Profile not found for cookie user:", user.id);
      return null;
    }

    const profile = profileRows[0];
    const { data: permsData } = await admin.rpc("get_user_permissions", { p_user_id: profile.id });
    const permissions = (permsData || []).map((p: { permission_key?: string } | string) =>
      typeof p === "string" ? p : (p.permission_key || String(p))
    );

    return {
      userId: profile.id,
      email: profile.email,
      role: profile.role as UserRole,
      userCategory: profile.user_category as UserCategory,
      fullName: profile.full_name,
      campusId: profile.campus_id,
      passwordChanged: profile.password_changed,
      onboardingCompleted: profile.onboarding_completed,
      isActive: profile.is_active !== false,
      permissions,
    };
  } catch (e) {
    console.error("[upload] Cookie auth fallback crashed:", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  console.info(`[${requestId}] [UPLOAD-STEP-1] Request received`);

  try {
    console.info(`[${requestId}] [UPLOAD-STEP-2] Authenticating request`);
    const session = await getSessionFromRequest(req);
    if (!session) {
      console.info(`[${requestId}] [UPLOAD-STEP-2a] Authentication failed`);
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.info(`[${requestId}] [UPLOAD-STEP-3] Auth passed:`, session.userId);

    console.info(`[${requestId}] [UPLOAD-STEP-4] Checking rate limit`);
    const identifier = getClientIP(req) + ":upload";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.upload);
    if (!rateOk) {
      console.info(`[${requestId}] [UPLOAD-STEP-5] Rate limit exceeded`);
      return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
    }
    console.info(`[${requestId}] [UPLOAD-STEP-6] Rate limit OK`);

    console.info(`[${requestId}] [UPLOAD-STEP-7] Parsing formData`);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";
    console.info(`[${requestId}] [UPLOAD-STEP-8] File:`, file ? file.name : "null", "Type:", file?.type, "Size:", file?.size, "Folder:", folder);

    if (!file) {
      console.info(`[${requestId}] [UPLOAD-STEP-9] No file provided`);
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_FOLDERS.includes(folder)) {
      console.info(`[${requestId}] [UPLOAD-STEP-9a] Invalid folder:`, folder);
      return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      console.info(`[${requestId}] [UPLOAD-STEP-10] File too large:`, file.size);
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      console.info(`[${requestId}] [UPLOAD-STEP-11] File type not allowed:`, file.type);
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeName = `${Date.now()}_${session.userId.slice(0, 8)}.${ext}`;
    const path = `${folder}/${safeName}`;
    console.info(`[${requestId}] [UPLOAD-STEP-12] Target path:`, path);

    console.info(`[${requestId}] [UPLOAD-STEP-13] Converting to Buffer`);
    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      console.info(`[${requestId}] [UPLOAD-STEP-14] ArrayBuffer received, length:`, arrayBuffer.byteLength);
      buffer = Buffer.from(arrayBuffer);
      console.info(`[${requestId}] [UPLOAD-STEP-15] Buffer created, length:`, buffer.length);
    } catch (bufErr) {
      console.error(`[${requestId}] [UPLOAD-STEP-16] Buffer conversion failed:`, bufErr);
      return NextResponse.json(
        { error: "Failed to read file: " + getErrorMessage(bufErr) },
        { status: 500 }
      );
    }

    const admin = getSupabaseAdmin();

    console.info(`[${requestId}] [UPLOAD-STEP-17] Listing storage buckets`);
    const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
    if (bucketError) {
      console.error(`[${requestId}] [UPLOAD-STEP-18] Bucket list failed:`, bucketError);
      return NextResponse.json(
        { error: "Storage unavailable: " + bucketError.message },
        { status: 500 }
      );
    }
    const bucketExists = buckets?.some((b) => b.name === "bdja-uploads");
    console.info(`[${requestId}] [UPLOAD-STEP-19] Bucket exists:`, bucketExists);
    if (!bucketExists) {
      console.error(`[${requestId}] [UPLOAD-STEP-20] Bucket missing. Available:`, buckets?.map((b) => b.name));
      return NextResponse.json(
        { error: "Storage bucket 'bdja-uploads' not found." },
        { status: 500 }
      );
    }

    console.info(`[${requestId}] [UPLOAD-STEP-21] Uploading to storage`);
    const { data, error } = await admin.storage
      .from("bdja-uploads")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: "3600",
      });

    if (error) {
      console.error(`[${requestId}] [UPLOAD-STEP-22] Storage upload error:`, JSON.stringify(error));
      return NextResponse.json(
        { error: "Upload failed: " + error.message, code: error.name || "STORAGE_ERROR" },
        { status: 500 }
      );
    }
    console.info(`[${requestId}] [UPLOAD-STEP-23] Upload success`);

    console.info(`[${requestId}] [UPLOAD-STEP-24] Getting public URL`);
    const { data: urlData } = admin.storage.from("bdja-uploads").getPublicUrl(path);
    console.info(`[${requestId}] [UPLOAD-STEP-25] Public URL:`, urlData.publicUrl);

    console.info(`[${requestId}] [UPLOAD-STEP-26] Returning success`);
    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: unknown) {
    console.error(`[${requestId}] [UPLOAD-CATCH] Error type:`, (error as Error).constructor?.name);
    console.error(`[${requestId}] [UPLOAD-CATCH] Error message:`, getErrorMessage(error));
    console.error(`[${requestId}] [UPLOAD-CATCH] Full error:`, error);
    if (isAuthError(error)) {
      const status = error instanceof AuthRequiredError ? error.statusCode : 401;
      console.info(`[${requestId}] [UPLOAD-CATCH] Auth error detected, returning`, status);
      return NextResponse.json({ error: getErrorMessage(error) }, { status });
    }
    console.error(`[${requestId}] [UPLOAD-CATCH] Non-auth error, returning 500`);
    return NextResponse.json(
      { error: "Upload failed: " + getErrorMessage(error), type: (error as Error).constructor?.name },
      { status: 500 }
    );
  }
}
