import express from "express";
import * as controller from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verifyEmailLimiter,
  refreshTokenLimiter,
  resendVerificationLimiter,
} from "../middlewares/rateLimiters.js";

const router = express.Router();

// Public routes
router.post("/register", registerLimiter, controller.register);
router.post("/verify-email", verifyEmailLimiter, controller.verifyEmail);
router.post("/resend-verification", resendVerificationLimiter, controller.resendVerification);
router.post("/login", loginLimiter, controller.login);
router.post("/refresh", refreshTokenLimiter, controller.refresh);
router.post("/forgot-password", forgotPasswordLimiter, controller.forgotPassword);
router.post("/reset-password", resetPasswordLimiter, controller.resetPassword);

// Protected route
router.post("/logout", authMiddleware, controller.logout);

export default router;
