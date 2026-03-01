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

export const updateMyProfileSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  })
  .refine((d) => d.name !== undefined, { message: "At least one field must be provided" });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword:     z
      .string()
      .min(8,  "Password must be at least 8 characters")
      .max(64, "Password must be at most 64 characters"),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: "New password must be different from the current password",
    path:    ["newPassword"],
  });

export const createUserSchema = z.object({
  name:         z.string().min(2, "Name must be at least 2 characters").max(100),
  email:        z.string().email("Invalid email address"),
  password:     z.string().min(8, "Password must be at least 8 characters").max(64),
  roleType:     RoleType.optional().default("CALL_OPERATOR"),
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
});
