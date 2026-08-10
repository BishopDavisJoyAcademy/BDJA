"use server";

import { getSupabaseAdmin } from "./supabase-server";

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export async function rateLimit(identifier: string, options: RateLimitOptions = { limit: 20, windowMs: 60000 }): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const admin = getSupabaseAdmin();
  const now = Date.now();
  const windowStart = new Date(now - options.windowMs).toISOString();

  try {
    const { data: attempts, error } = await admin
      .from("login_attempts")
      .select("id, created_at")
      .eq("ip_address", identifier)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false })
      .limit(options.limit + 1);

    if (error) throw error;

    const count = attempts?.length || 0;
    if (count >= options.limit) {
      const oldest = attempts?.[0]?.created_at;
      const resetAt = oldest ? new Date(oldest).getTime() + options.windowMs : now + options.windowMs;
      return { success: false, remaining: 0, resetAt };
    }

    return { success: true, remaining: options.limit - count - 1, resetAt: now + options.windowMs };
  } catch (err) {
    console.error("[rate-limit] DB rate limit failed:", err);
    return { success: true, remaining: options.limit - 1, resetAt: now + options.windowMs };
  }
}

export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
  return ip;
}

export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 300000 },
  passwordChange: { limit: 3, windowMs: 3600000 },
  api: { limit: 100, windowMs: 60000 },
  chat: { limit: 20, windowMs: 60000 },
  upload: { limit: 10, windowMs: 60000 },
  impersonate: { limit: 10, windowMs: 3600000 },
  suggestions: { limit: 10, windowMs: 3600000 },
} as const;
