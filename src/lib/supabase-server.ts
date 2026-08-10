import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error("Missing Supabase server environment variables");
}

let _admin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!_admin) {
    _admin = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _admin;
}
