import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role.type,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_EXPIRY },
  );
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

export const generateEmailVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return { rawToken, hashedToken };
};

export const generateResetPasswordToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return { rawToken, hashedToken };
};

export const getExpiryTime = (minutes) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};


const DURATION_UNITS_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

const parseDuration = (duration) => {
  const match = String(duration).match(/^(\d+)([smhd])$/);
  if (!match)
    throw new Error(
      `Invalid duration format: "${duration}". Use e.g. "7d", "24h", "15m", "60s".`,
    );
  return parseInt(match[1], 10) * DURATION_UNITS_MS[match[2]];
};

export const parseDurationToDate = (duration) =>
  new Date(Date.now() + parseDuration(duration));

export const parseDurationToMs = (duration) => parseDuration(duration);

export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};
