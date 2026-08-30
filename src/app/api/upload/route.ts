import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-client";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limiter";
import { getClientIP } from "@/lib/security";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

interface AuthUser {
  userId: string;
  email: string;
  role: string;
  userCategory: string;
  fullName: string;
}

/**
 * Authenticate using cookies — identical to middleware.
 * No Authorization header. No localStorage token.
 * Browser sends cookies automatically with credentials: "include".
 */
async function authenticateFromCookies(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("[upload-sign] Cookie auth: no user", userError?.message);
      return null;
    }

    const admin = getSupabaseAdmin();
    const { data: rows, error: profileError } = await admin
      .from("profiles")
      .select("id, email, full_name, role, user_category, is_active")
      .eq("id", user.id)
      .limit(1);

    if (profileError || !rows || rows.length === 0) {
      console.warn("[upload-sign] Cookie auth: profile missing", profileError?.message);
      return null;
    }

    const profile = rows[0];
    if (profile.is_active === false) {
      console.warn("[upload-sign] Cookie auth: suspended", user.id);
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
    console.error("[upload-sign] Cookie auth crashed:", err);
    return null;
  }
}

/**
 * POST /api/upload
 * Body: { filename: string, contentType: string }
 * Returns: { signedUrl: string, publicUrl: string, path: string, token: string }
 *
 * This is the signed URL pattern used by WhatsApp, Instagram, AWS S3, and Supabase.
 * The server validates auth, generates a signed upload URL, and returns it.
 * The client then uploads the file DIRECTLY to Supabase Storage via XMLHttpRequest.
 * Zero server bandwidth. Real upload progress. No Vercel body limits.
 */
export async function POST(req: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    console.info(`[upload-sign:${requestId}] Step 1: Authenticating via cookies`);
    const authUser = await authenticateFromCookies();
    if (!authUser) {
      console.info(`[upload-sign:${requestId}] Step 1a: Auth failed — 401`);
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.info(`[upload-sign:${requestId}] Step 2: Auth OK — ${authUser.userId}`);

    console.info(`[upload-sign:${requestId}] Step 3: Rate limit check`);
    const identifier = getClientIP(req) + ":upload";
    const { success: rateOk } = await rateLimit(identifier, RATE_LIMITS.upload);
    if (!rateOk) {
      return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
    }

    console.info(`[upload-sign:${requestId}] Step 4: Parsing request body`);
    const body = await req.json();
    const { filename, contentType } = body;

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "filename required" }, { status: 400 });
    }
    if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json({ error: `File type not allowed: ${contentType}` }, { status: 400 });
    }

    const ext = contentType === "image/png" ? "png" : contentType === "image/gif" ? "gif" : "webp";
    const path = `avatars/${Date.now()}_${authUser.userId.slice(0, 8)}.${ext}`;
    console.info(`[upload-sign:${requestId}] Step 5: Target path: ${path}`);

    console.info(`[upload-sign:${requestId}] Step 6: Generating signed URL`);
    const admin = getSupabaseAdmin();

    const { data: signedData, error: signedError } = await admin.storage
      .from("bdja-uploads")
      .createSignedUploadUrl(path);

    if (signedError || !signedData) {
      console.error(`[upload-sign:${requestId}] Signed URL failed:`, signedError);
      return NextResponse.json(
        { error: `Storage error: ${signedError?.message || "Unknown"}` },
        { status: 500 }
      );
    }

    console.info(`[upload-sign:${requestId}] Step 7: Getting public URL`);
    const { data: publicData } = admin.storage.from("bdja-uploads").getPublicUrl(path);

    console.info(`[upload-sign:${requestId}] Step 8: Returning signed URL`);
    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      publicUrl: publicData.publicUrl,
      path,
      token: signedData.token,
    });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[upload-sign:${requestId}] CRASH:`, err.name, err.message);
    return NextResponse.json(
      { error: `Upload setup failed: ${err.message}` },
      { status: 500 }
    );
  }
}
