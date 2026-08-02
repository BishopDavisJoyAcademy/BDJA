import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; error?: string }> = {};

  // Check env vars
  const envVars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = envVars.filter((v) => !process.env[v]);
  checks.env = { ok: missing.length === 0, error: missing.length > 0 ? `Missing: ${missing.join(", ")}` : undefined };

  // Check database connection
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("profiles").select("id").limit(1);
    checks.database = { ok: !error, error: error?.message };
  } catch (e: any) {
    checks.database = { ok: false, error: e.message };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    { status: allOk ? "healthy" : "unhealthy", checks },
    { status: allOk ? 200 : 500 }
  );
}
