import { createServerClient } from "@supabase/ssr";
import { Database } from "@/types/database";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * For Server Components — read-only cookie access.
 * Do NOT use in Route Handlers that need to write cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        // Server Components are read-only — ignore writes
        // Route handlers should use createRouteHandlerClient instead
      },
    },
  });
}

/**
 * For Route Handlers — properly writes cookies to the response.
 * This is the ONLY way to persist Supabase auth cookies in Next.js 15 App Router.
 */
export async function createRouteHandlerClient(
  req: NextRequest,
  response: NextResponse
) {
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
        });
      },
    },
  });
}
