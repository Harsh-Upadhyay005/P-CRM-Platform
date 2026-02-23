import express from "express";
import * as controller from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", controller.register);
router.post("/verify-email", controller.verifyEmail);
router.post("/login", controller.login);
router.post("/refresh", controller.refresh);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);

// Protected route
router.post("/logout", authMiddleware, controller.logout);

export default router;
