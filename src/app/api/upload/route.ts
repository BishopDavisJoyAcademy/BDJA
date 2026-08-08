import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) || "document";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    // 50MB limit
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `File too large. Max: ${(MAX_SIZE / 1024 / 1024).toFixed(0)}MB` }, { status: 413 });
    }

    const admin = getSupabaseAdmin();

    // Verify bucket exists
    const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
    if (bucketError) {
      console.error("[upload] Failed to list buckets:", bucketError);
      return NextResponse.json({ error: "Storage configuration error" }, { status: 500 });
    }

    const bucketExists = buckets?.some((b: { name: string }) => b.name === "attachments");
    if (!bucketExists) {
      console.error("[upload] Bucket 'attachments' not found. Available:", buckets?.map((b: { name: string }) => b.name));
      return NextResponse.json(
        { error: "Storage bucket 'attachments' not found. Run: insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true);" },
        { status: 500 }
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "bin";
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${safeName}`;
    const path = `${type}/${filename}`;

    console.log("[upload] Uploading:", file.name, "size:", file.size, "type:", file.type, "path:", path);

    // Upload to Supabase Storage
    const { data, error } = await admin.storage
      .from("attachments")
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      console.error("[upload] Storage upload error:", error);
      return NextResponse.json({ error: error.message || "Storage upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = admin.storage.from("attachments").getPublicUrl(path);
    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      return NextResponse.json({ error: "Failed to generate public URL" }, { status: 500 });
    }

    console.log("[upload] Success:", publicUrl);

    return NextResponse.json({
      url: publicUrl,
      path,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error("[upload] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed unexpectedly" },
      { status: 500 }
    );
  }
}
