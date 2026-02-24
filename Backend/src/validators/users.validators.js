import { z } from "zod";

const RoleType = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "DEPARTMENT_HEAD",
  "OFFICER",
  "CALL_OPERATOR",
]);

export const assignRoleSchema = z.object({
  roleType:     RoleType,
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
});

export const setUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: "isActive must be a boolean" }),
});

export const updateMyProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
});
