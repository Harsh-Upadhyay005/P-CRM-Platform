import { Redis } from "@upstash/redis";
import { env } from "./env.js";

let redis = null;
let _blacklistEnabled = false;

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url:   env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  _blacklistEnabled = true;
  console.log("[redis] Connected — token blacklist enabled");
} else {
  console.warn("[redis] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — token blacklist disabled");
}

export const isBlacklistEnabled = () => _blacklistEnabled;

export const blacklistToken = async (jti, ttlSeconds) => {
  if (!redis || !_blacklistEnabled || ttlSeconds <= 0) return;
  try {
    await redis.set(`bl:${jti}`, "1", { ex: ttlSeconds });
  } catch {
  }
};

export const isTokenBlacklisted = async (jti) => {
  if (!redis || !_blacklistEnabled) return false;
  try {
    const result = await redis.get(`bl:${jti}`);
    return result === "1";
  } catch {
    return false;
  }
};

export const disconnectRedis = async () => {
  redis = null;
  _blacklistEnabled = false;
};

export { redis as redisClient };
