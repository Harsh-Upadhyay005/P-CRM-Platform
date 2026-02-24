import rateLimit from "express-rate-limit";

const rateLimitMessage = (action) => ({
  statusCode: 429,
  success:    false,
  data:       null,
  message:    `Too many ${action} attempts. Please try again later.`,
});

const base = {
  standardHeaders: true,
  legacyHeaders:   false,
};

export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max:      5,
  message:  rateLimitMessage("login"),
  skipSuccessfulRequests: true,
});

export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max:      10,
  message:  rateLimitMessage("registration"),
});

export const forgotPasswordLimiter = rateLimit({
  ...base,
  windowMs: 30 * 60 * 1000,
  max:      5,
  message:  rateLimitMessage("password reset"),
});

export const resetPasswordLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max:      5,
  message:  rateLimitMessage("password reset"),
});

export const verifyEmailLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  rateLimitMessage("email verification"),
});

export const refreshTokenLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max:      30,
  message:  rateLimitMessage("token refresh"),
});

export const resendVerificationLimiter = rateLimit({
  ...base,
  windowMs: 30 * 60 * 1000,
  max:      3,
  message:  rateLimitMessage("resend verification"),
});

export const apiWriteLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max:      60,
  message:  rateLimitMessage("write"),
});
