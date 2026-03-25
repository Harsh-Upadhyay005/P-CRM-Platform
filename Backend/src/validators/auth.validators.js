import { z } from "zod";
import { STATE_CODES } from "../constants/stateCodes.js";

export const registerSchema = z.object({
  name:       z.string().min(2, "Name must be at least 2 characters").max(100),
  email:      z.string().email("Invalid email address"),
  password:   z.string().min(8, "Password must be at least 8 characters").max(64, "Password must be at most 64 characters"),
  tenantSlug: z.string().min(2, "Tenant slug is required").max(100),
});

export const loginSchema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token:       z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(64, "Password must be at most 64 characters"),
});

export const generateSuperAdminCodeSchema = z.object({
  stateCode: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .refine((v) => STATE_CODES.includes(v), "Invalid state code"),
  expiresInDays: z.number().int().min(1).max(90).optional().default(30),
});

export const superAdminSignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(64, "Password must be at most 64 characters"),
  signupCode: z.string().min(8, "Signup code is required").max(120),
});
