import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Lazy singleton — only created when env vars are present.
let _redis = null;
let _pinged = false;
function getRedis() {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn("[rate-limit] Redis not configured — rate limiting disabled.");
    return null;
  }
  _redis = new Redis({ url, token });
  if (!_pinged) {
    _pinged = true;
    _redis.ping().then(() => {
      console.log("[rate-limit] ✅ Redis connected (Upstash)");
    }).catch((err) => {
      console.error("[rate-limit] ❌ Redis connection failed:", err?.message ?? err);
    });
  }
  return _redis;
}

// Per-route sliding-window configs: [maxRequests, windowString]
const CONFIGS = {
  "check-code":  [10, "1 m"],
  summarize:     [20, "1 m"],
  "duel-submit": [15, "1 m"],
  "raid-submit": [15, "1 m"],
};

const _limiters = {};
function getLimiter(key) {
  const redis = getRedis();
  if (!redis) return null;
  if (!_limiters[key]) {
    const [requests, window] = CONFIGS[key];
    _limiters[key] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix: `rl:${key}`,
    });
  }
  return _limiters[key];
}

function getIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Check rate limit for a route. Returns a 429 Response if exceeded, null if allowed.
 * If Redis is not configured, always returns null (no-op).
 *
 * @param {Request} request - The incoming request (used for IP fallback)
 * @param {"check-code"|"summarize"|"duel-submit"|"raid-submit"} key - Route key
 * @param {string|null} userId - Clerk userId (primary identifier); falls back to IP
 */
export async function applyRateLimit(request, key, userId) {
  const limiter = getLimiter(key);
  if (!limiter) return null;

  const identifier = userId ?? `ip:${getIp(request)}`;
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return Response.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(reset),
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    );
  }
  return null;
}
