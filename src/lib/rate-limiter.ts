// Pure in-memory rate limiter — no external dependencies
// If you need Upstash Redis rate limiting later, install @upstash/ratelimit and @upstash/redis,
// then replace this file with the Redis-backed version.

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

export async function rateLimit(identifier: string, options?: { limit?: number; windowMs?: number }) {
  const limit = options?.limit ?? 10;
  const windowMs = options?.windowMs ?? 60000;
  return memoryRateLimit(identifier, limit, windowMs);
}

export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "anonymous";
  return ip;
}
