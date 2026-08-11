import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error("Missing Supabase server environment variables");
}

let _admin: SupabaseClient<Database, "public"> | undefined;

export function getSupabaseAdmin(): SupabaseClient<Database, "public"> {
  if (!_admin) {
    _admin = createClient<Database, "public">(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _admin;
}
