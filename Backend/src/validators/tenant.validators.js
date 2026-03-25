import { z } from "zod";
import { STATE_CODES } from "../constants/stateCodes.js";

const stateCodeSchema = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .refine((v) => STATE_CODES.includes(v), "Invalid state code");

export const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only").optional(),
  stateCode: stateCodeSchema,
  stateLabel: z.string().min(2).max(100),
  districtLabel: z.string().min(2).max(100),
  areas: z.array(z.string().min(1).max(200)).min(1, "At least one service area is required").max(50),
});

export const updateTenantSchema = z.object({
  name:     z.string().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
  stateCode: stateCodeSchema.optional(),
  stateLabel: z.string().min(2).max(100).optional(),
  districtLabel: z.string().min(2).max(100).optional(),
  areas: z.array(z.string().min(1).max(200)).min(1, "At least one service area is required").max(50).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "At least one field required" });
