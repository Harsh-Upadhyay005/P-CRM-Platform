import express from "express";
import * as controller from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verifyEmailLimiter,
  refreshTokenLimiter,
  resendVerificationLimiter,
} from "../middlewares/rateLimiters.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validators.js";

const router = express.Router();

router.post("/register",             registerLimiter,          validate(registerSchema),             controller.register);
router.post("/verify-email",         verifyEmailLimiter,       validate(verifyEmailSchema),           controller.verifyEmail);
router.post("/resend-verification",  resendVerificationLimiter, validate(resendVerificationSchema),   controller.resendVerification);
router.post("/login",                loginLimiter,             validate(loginSchema),                 controller.login);
router.post("/refresh",              refreshTokenLimiter,                                             controller.refresh);
router.post("/forgot-password",      forgotPasswordLimiter,    validate(forgotPasswordSchema),        controller.forgotPassword);
router.post("/reset-password",       resetPasswordLimiter,     validate(resetPasswordSchema),         controller.resetPassword);

router.post("/logout", authMiddleware, controller.logout);

export default router;
