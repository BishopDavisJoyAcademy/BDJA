/**
 * Server Supabase Admin Client
 * Bypasses RLS. Use only for server-side ops.
 */

export function getSupabaseAdmin() {
  const { createClient: createAdminClient } = require("@supabase/supabase-js");
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
