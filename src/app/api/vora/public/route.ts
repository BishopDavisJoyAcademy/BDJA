import { NextRequest, NextResponse } from "next/server";
import { searchVoraContent } from "@/lib/vora";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const grade_level = searchParams.get("grade_level") || undefined;
    const subject = searchParams.get("subject") || undefined;
    const limit = parseInt(searchParams.get("limit") || "10");

    const results = searchVoraContent(query, { grade_level, subject, limit });
    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("[api/vora/public] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
