import rateLimit from "express-rate-limit";

const rateLimitMessage = (action) => ({
  statusCode: 429,
  success: false,
  data: null,
  message: `Too many ${action} attempts. Please try again later.`,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("login"),
  skipSuccessfulRequests: true,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("registration"),
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 min
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("password reset"),
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("password reset"),
});

export const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("email verification"),
});

export const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("token refresh"),
});

// 3 resend attempts per 30 min — prevents inbox bombing
export const resendVerificationLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 min
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("resend verification"),
});
