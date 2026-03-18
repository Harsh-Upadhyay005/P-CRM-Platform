import { z } from "zod";

export const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only").optional(),
  areas: z.array(z.string().min(1).max(200)).max(50).optional(),
});

export const updateTenantSchema = z.object({
  name:     z.string().min(2).max(100).optional(),
  isActive: z.boolean().optional(),
  areas: z.array(z.string().min(1).max(200)).max(50).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "At least one field required" });
