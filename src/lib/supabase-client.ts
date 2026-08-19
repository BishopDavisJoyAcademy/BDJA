import { createServerClient } from "@supabase/ssr";
import { Database } from "@/types/database";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates a Supabase server client for use in:
 * - Server Components (read-only cookie access, writes are ignored)
 * - Route Handlers (read-write cookie access — Next.js 15 allows cookieStore.set() in route handlers)
 * - Server Actions (read-write cookie access)
 *
 * In route handlers, the setAll callback uses cookieStore.set() which Next.js
 * automatically forwards to the response. No manual cookie copying needed.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          );
        } catch {
          // Server Components are read-only — ignore writes
        }
      },
    },
  });
}
