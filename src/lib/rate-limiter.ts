/**
 * BDJA Rate Limiter v5.0 - Production Hardened
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();

// Cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  });
}, 300000);

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export async function rateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 20, windowMs: 60000 }
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return { success: true, remaining: options.limit - 1, resetAt: now + options.windowMs };
  }

  if (entry.count >= options.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: options.limit - entry.count, resetAt: entry.resetAt };
}

export function getClientIdentifier(req: any): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
  return ip;
}

// Strict rate limits for sensitive operations
export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 300000 },      // 5 per 5 min
  passwordChange: { limit: 3, windowMs: 3600000 }, // 3 per hour
  api: { limit: 100, windowMs: 60000 },         // 100 per min
  chat: { limit: 20, windowMs: 60000 },         // 20 per min
  upload: { limit: 10, windowMs: 60000 },        // 10 per min
  impersonate: { limit: 10, windowMs: 3600000 },  // 10 per hour
  suggestions: { limit: 10, windowMs: 3600000 }, // 10 per hour
};
