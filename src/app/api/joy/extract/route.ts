import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { extractContent } from "@/lib/joy-extract";
import { getErrorMessage, AuthRequiredError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 });
    }

    const result = await extractContent(file, file.name);
    return NextResponse.json({
      text: result.text,
      type: result.type,
      pages: result.pages,
      wordCount: result.wordCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? getErrorMessage(error) : "Extraction failed";
    if (error instanceof AuthRequiredError) {
      return NextResponse.json({ error: message }, { status: error.statusCode || 401 });
    }
    console.error("[joy/extract] Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
