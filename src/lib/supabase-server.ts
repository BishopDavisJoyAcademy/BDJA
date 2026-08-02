import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Lazy initialization — env vars read at FIRST USE, not import time
let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;

  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  _supabaseAdmin = createClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseAdmin;
}

// Backward-compatible export
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export function createServerSupabaseClient() {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const cookieStore = cookies();

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}

export async function getCurrentUser(req?: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const admin = getSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  return { user: session.user, profile };
}
