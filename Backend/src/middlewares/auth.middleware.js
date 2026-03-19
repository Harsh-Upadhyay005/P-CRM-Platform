import { verifyAccessToken } from "../utils/token.utils.js";
import { ApiError } from "../utils/ApiError.js";
import { isTokenBlacklisted } from "../config/redis.js";

const readRawCookieValue = (cookieHeader, key) => {
  if (!cookieHeader || typeof cookieHeader !== "string") return null;
  const pattern = new RegExp(`(?:^|;\\s*)${key}=([^;]+)`);
  const match = cookieHeader.match(pattern);
  return match?.[1] ?? null;
};

const normalizeToken = (token) => {
  if (!token || typeof token !== "string") return null;
  const trimmed = token.trim().replace(/^"|"$/g, "");
  if (!trimmed) return null;
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
};

const extractAccessToken = (req) => {
  const cookieToken = req.cookies?.accessToken;
  if (cookieToken) return normalizeToken(cookieToken);

  const authorization = req.headers.authorization;
  if (typeof authorization === "string") {
    const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch?.[1]) return normalizeToken(bearerMatch[1]);
  }

  const xAccessToken = req.headers["x-access-token"];
  if (typeof xAccessToken === "string") return normalizeToken(xAccessToken);
  if (Array.isArray(xAccessToken) && xAccessToken[0]) return normalizeToken(xAccessToken[0]);

  const rawCookieToken = readRawCookieValue(req.headers.cookie, "accessToken");
  return normalizeToken(rawCookieToken);
};

export const authMiddleware = async (req, res, next) => {
  const token = extractAccessToken(req);

  if (!token) {
    throw new ApiError(401, "Unauthorized");
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  if (decoded.jti && await isTokenBlacklisted(decoded.jti)) {
    throw new ApiError(401, "Token has been revoked");
  }

  req.user = decoded;
  next();
};
