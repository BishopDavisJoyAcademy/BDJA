import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIP } from "@/lib/security";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB after client compression
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

interface UploadResult {
  success: boolean;
  url: string;
  path: string;
  filename: string;
  size: number;
  type: string;
}

/**
 * Authenticate the request using cookies — the SAME mechanism as middleware.
 * This is how WhatsApp Web, Instagram Web, and every major app handles uploads.
 * The browser sends cookies automatically. We read them server-side.
 * No fragile Authorization header from browser localStorage.
 */
async function authenticateFromCookies(): Promise<{
  userId: string;
  email: string;
  role: string;
  userCategory: string;
  fullName: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("[upload] Cookie auth: no user found", userError?.message);
      return null;
    }

    const admin = getSupabaseAdmin();
    const { data: rows, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name, role, user_category, is_active")
      .eq("id", user.id)
      .limit(1);

    if (profileError || !rows || rows.length === 0) {
      console.warn("[upload] Cookie auth: profile not found", profileError?.message);
      return null;
    }

    const profile = rows[0];
    if (profile.is_active === false) {
      console.warn("[upload] Cookie auth: account suspended", user.id);
      return null;
    }

    return {
      userId: profile.id,
      email: profile.email,
      role: profile.role,
      userCategory: profile.user_category,
      fullName: profile.full_name,
    };
  } catch (err) {
    console.error("[upload] Cookie auth crashed:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    console.info(`[upload:${requestId}] Step 1: Authenticating via cookies`);
    const authUser = await authenticateFromCookies();
    if (!authUser) {
      console.info(`[upload:${requestId}] Step 1a: Auth failed — returning 401`);
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.info(`[upload:${requestId}] Step 2: Auth OK — user ${authUser.userId}`);

    console.info(`[upload:${requestId}] Step 3: Rate limit check`);
    const identifier = getClientIP(req) + ":upload";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.upload);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
    }

    console.info(`[upload:${requestId}] Step 4: Parsing formData`);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const updateProfile = formData.get("updateProfile") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}` },
        { status: 400 }
      );
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/gif" ? "gif" : "webp";
    const safeName = `${Date.now()}_${authUser.userId.slice(0, 8)}.${ext}`;
    const path = `avatars/${safeName}`;
    console.info(`[upload:${requestId}] Step 5: Target path: ${path}`);

    console.info(`[upload:${requestId}] Step 6: Converting to Buffer`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.info(`[upload:${requestId}] Step 7: Buffer ready — ${buffer.length} bytes`);

    const admin = getSupabaseAdmin();

    console.info(`[upload:${requestId}] Step 8: Verifying storage bucket`);
    const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
    if (bucketError) {
      console.error(`[upload:${requestId}] Bucket list failed:`, bucketError);
      return NextResponse.json(
        { error: "Storage service unavailable" },
        { status: 503 }
      );
    }
    const bucketExists = buckets?.some((b) => b.name === "bdja-uploads");
    if (!bucketExists) {
      console.error(`[upload:${requestId}] Bucket 'bdja-uploads' missing`);
      return NextResponse.json(
        { error: "Storage bucket not configured" },
        { status: 500 }
      );
    }

    console.info(`[upload:${requestId}] Step 9: Uploading to Supabase Storage`);
    const { error: uploadError } = await admin.storage
      .from("bdja-uploads")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: "86400",
      });

    if (uploadError) {
      console.error(`[upload:${requestId}] Storage upload failed:`, uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }
    console.info(`[upload:${requestId}] Step 10: Storage upload OK`);

    console.info(`[upload:${requestId}] Step 11: Getting public URL`);
    const { data: urlData } = admin.storage.from("bdja-uploads").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    console.info(`[upload:${requestId}] Step 12: Public URL: ${publicUrl}`);

    // ATOMIC: Update profile avatar_url in the same request
    if (updateProfile) {
      console.info(`[upload:${requestId}] Step 13: Updating profile avatar_url`);
      const { error: profileUpdateError } = await admin
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", authUser.userId);

      if (profileUpdateError) {
        console.error(`[upload:${requestId}] Profile update failed:`, profileUpdateError);
        // Don't fail the upload — the file is stored, user can retry profile update
        return NextResponse.json({
          success: true,
          url: publicUrl,
          path,
          filename: file.name,
          size: file.size,
          type: file.type,
          warning: "File uploaded but profile update failed. Please refresh.",
        } as UploadResult & { warning: string });
      }
      console.info(`[upload:${requestId}] Step 14: Profile updated`);
    }

    console.info(`[upload:${requestId}] Step 15: Success`);
    return NextResponse.json({
      success: true,
      url: publicUrl,
      path,
      filename: file.name,
      size: file.size,
      type: file.type,
    } as UploadResult);

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[upload:${requestId}] CRASH:`, err.name, err.message);
    return NextResponse.json(
      { error: `Upload failed: ${err.message}` },
      { status: 500 }
    );
  }
}
