import { verifyAccessToken } from "../utils/token.utils.js";
import { ApiError } from "../utils/ApiError.js";
import { isTokenBlacklisted } from "../config/redis.js";

export const authMiddleware = async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

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
