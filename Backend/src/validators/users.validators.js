import { z } from "zod";

const RoleType = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "DEPARTMENT_HEAD",
  "OFFICER",
  "CALL_OPERATOR",
]);

export const assignRoleSchema = z.object({
  type:         RoleType,
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
});

export const setUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: "isActive must be a boolean" }),
});

export const updateMyProfileSchema = z
  .object({
    name:         z.string().min(2).max(100).optional(),
    departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
  })
  .refine(
    (d) => d.name !== undefined || d.departmentId !== undefined,
    { message: "At least one field must be provided" },
  );
