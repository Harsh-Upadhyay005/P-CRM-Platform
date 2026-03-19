import { z } from "zod";

const Priority = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const optionalTenantId = z.string().uuid("Invalid tenant ID").optional();

const patternList = z
  .array(z.string().min(1).max(100))
  .max(100, "Cannot include more than 100 patterns")
  .optional();

export const workflowSettingSchema = z
  .object({
    tenantId: optionalTenantId,
    smartRoutingEnabled: z.boolean().optional(),
    autoCloseEnabled: z.boolean().optional(),
    autoCloseAfterDays: z
      .number({ invalid_type_error: "autoCloseAfterDays must be a number" })
      .int("autoCloseAfterDays must be an integer")
      .min(1, "autoCloseAfterDays must be at least 1")
      .max(365, "autoCloseAfterDays cannot exceed 365")
      .optional(),
  })
  .refine(
    (d) =>
      d.smartRoutingEnabled !== undefined ||
      d.autoCloseEnabled !== undefined ||
      d.autoCloseAfterDays !== undefined,
    { message: "At least one setting field must be provided" },
  );

export const createAssignmentRuleSchema = z.object({
  tenantId: optionalTenantId,
  name: z.string().min(3, "name must be at least 3 characters").max(120),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  priority: z
    .number({ invalid_type_error: "priority must be a number" })
    .int("priority must be an integer")
    .min(1, "priority must be at least 1")
    .max(10_000, "priority cannot exceed 10000")
    .optional(),
  stopOnMatch: z.boolean().optional(),
  categoryPatterns: patternList,
  areaPatterns: patternList,
  keywordPatterns: patternList,
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
  assignToId: z.string().uuid("Invalid user ID").optional().nullable(),
  setPriority: Priority.optional().nullable(),
});

export const updateAssignmentRuleSchema = z
  .object({
    tenantId: optionalTenantId,
    name: z.string().min(3).max(120).optional(),
    description: z.string().max(500).optional().nullable(),
    isActive: z.boolean().optional(),
    priority: z.number().int().min(1).max(10_000).optional(),
    stopOnMatch: z.boolean().optional(),
    categoryPatterns: patternList,
    areaPatterns: patternList,
    keywordPatterns: patternList,
    departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
    assignToId: z.string().uuid("Invalid user ID").optional().nullable(),
    setPriority: Priority.optional().nullable(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.isActive !== undefined ||
      d.priority !== undefined ||
      d.stopOnMatch !== undefined ||
      d.categoryPatterns !== undefined ||
      d.areaPatterns !== undefined ||
      d.keywordPatterns !== undefined ||
      d.departmentId !== undefined ||
      d.assignToId !== undefined ||
      d.setPriority !== undefined,
    { message: "At least one field must be provided" },
  );

export const upsertCategorySlaSchema = z.object({
  tenantId: optionalTenantId,
  categoryLabel: z.string().min(2).max(120),
  categoryKey: z.string().min(2).max(120).optional(),
  slaHours: z
    .number({ invalid_type_error: "slaHours must be a number" })
    .int("slaHours must be an integer")
    .min(1, "slaHours must be at least 1")
    .max(8760, "slaHours cannot exceed 8760"),
  isActive: z.boolean().optional(),
});
