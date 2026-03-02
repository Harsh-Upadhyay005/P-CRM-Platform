import { z } from "zod";

const serviceAreasField = z
  .array(z.string().min(1).max(100))
  .max(50, "Cannot add more than 50 service areas")
  .optional();

export const createDepartmentSchema = z.object({
  name:         z.string().min(2, "Name must be at least 2 characters").max(100),
  slaHours:     z
    .number({ invalid_type_error: "slaHours must be a number" })
    .int("slaHours must be an integer")
    .min(1, "slaHours must be at least 1")
    .max(8760, "slaHours cannot exceed 8760 (1 year)")
    .optional(),
  serviceAreas: serviceAreasField,
});

export const updateDepartmentSchema = z
  .object({
    name:         z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
    slaHours:     z
      .number({ invalid_type_error: "slaHours must be a number" })
      .int("slaHours must be an integer")
      .min(1, "slaHours must be at least 1")
      .max(8760, "slaHours cannot exceed 8760 (1 year)")
      .optional(),
    isActive:     z.boolean({ invalid_type_error: "isActive must be a boolean" }).optional(),
    serviceAreas: serviceAreasField,
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.slaHours !== undefined ||
      d.isActive !== undefined ||
      d.serviceAreas !== undefined,
    { message: "At least one field must be provided" },
  );
