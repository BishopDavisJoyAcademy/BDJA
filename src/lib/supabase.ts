import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing required Supabase environment variables");
}

// createBrowserClient stores the session in cookies (document.cookie)
// so server-side API routes can read them via cookies() / next/headers.
// createClient from @supabase/supabase-js stores in localStorage —
// invisible to server routes, which is why API calls got 401.
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseKey);
