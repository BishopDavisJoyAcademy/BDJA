import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const start = Date.now();
  let dbStatus = "unknown";

  try {
    const { error } = await supabaseAdmin.from("profiles").select("id").limit(1);
    dbStatus = error ? "error" : "ok";
  } catch {
    dbStatus = "error";
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "BDJA Platform",
    version: "2.0.0",
    database: dbStatus,
    response_time_ms: Date.now() - start,
  });
}
