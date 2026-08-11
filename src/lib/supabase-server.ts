import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

type DB = Omit<Database, "__InternalSupabase">;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error("Missing Supabase server environment variables");
}

let _admin: SupabaseClient<DB> | undefined;

export function getSupabaseAdmin(): SupabaseClient<DB> {
  if (!_admin) {
    _admin = createClient<DB>(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _admin;
}
