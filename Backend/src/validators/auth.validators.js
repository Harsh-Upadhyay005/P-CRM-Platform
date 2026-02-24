import { z } from "zod";

export const registerSchema = z.object({
  name:       z.string().min(2, "Name must be at least 2 characters").max(100),
  email:      z.string().email("Invalid email address"),
  password:   z.string().min(8, "Password must be at least 8 characters").max(128),
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
  token:    z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});
