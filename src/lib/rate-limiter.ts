// Rate limiter with optional Upstash Redis support
// Falls back to in-memory rate limiting if Upstash is not configured or installed

const memoryStore = new Map<string, { count: number; resetTime: number }>();

function memoryRateLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now();
  const record = memoryStore.get(identifier);

  if (!record || now > record.resetTime) {
    memoryStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  if (record.count >= limit) {
    return { success: false, limit, remaining: 0, reset: record.resetTime };
  }

  record.count++;
  return { success: true, limit, remaining: limit - record.count, reset: record.resetTime };
}

let upstashLimiter: any = null;
let upstashInitAttempted = false;

async function getUpstashLimiter() {
  if (upstashInitAttempted) return upstashLimiter;
  upstashInitAttempted = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    upstashLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
    });
    return upstashLimiter;
  } catch {
    // Upstash packages not installed — silently fall back to memory
    return null;
  }
}

export async function rateLimit(identifier: string, options?: { limit?: number; windowMs?: number }) {
  const limit = options?.limit ?? 10;
  const windowMs = options?.windowMs ?? 60000;

  const limiter = await getUpstashLimiter();
  if (limiter) {
    return await limiter.limit(identifier);
  }

  return memoryRateLimit(identifier, limit, windowMs);
}

export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "anonymous";
  return ip;
}
