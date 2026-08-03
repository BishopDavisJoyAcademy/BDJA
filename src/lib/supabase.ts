"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase Client — v0.12.4
 * 
 * createBrowserClient auto-detects document.cookie.
 * No manual cookie config needed. Session syncs automatically
 * across pages via the browser's cookie store.
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
