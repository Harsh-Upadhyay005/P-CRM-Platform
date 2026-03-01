import { z } from "zod";

const Priority = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const Status   = z.enum(["OPEN", "ASSIGNED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"]);

export const createComplaintSchema = z.object({
  citizenName:  z.string().min(2, "Citizen name must be at least 2 characters").max(100),
  citizenPhone: z
    .string()
    .regex(/^\+?[\d\s\-()\/.]{7,20}$/, "Invalid phone number"),
  citizenEmail: z.string().email("Invalid citizen email").optional().nullable(),
  description:  z.string().min(10, "Description must be at least 10 characters").max(5000),
  category:     z.string().min(2).max(100).optional().nullable(),
  priority:     Priority.optional(),
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
});

export const updateComplaintSchema = z
  .object({
    description: z.string().min(10).max(5000).optional(),
    category:    z.string().min(2).max(100).optional().nullable(),
    priority:    Priority.optional(),
  })
  .refine(
    (d) => d.description !== undefined || d.category !== undefined || d.priority !== undefined,
    { message: "At least one field must be provided" },
  );

export const assignComplaintSchema = z
  .object({
    assignedToId: z.string().uuid("Invalid user ID").optional().nullable(),
    departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
  })
  .refine(
    (d) => d.assignedToId != null || d.departmentId != null,
    { message: "At least one of assignedToId or departmentId must be provided" },
  );

export const updateStatusSchema = z.object({
  newStatus: Status,
  note: z.string().max(500).optional(),
});

export const addNoteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty").max(2000),
});

// ── PUBLIC SELF-FILING (citizen) ─────────────────────────────────────────
export const publicCreateComplaintSchema = z.object({
  citizenName:  z.string().min(2, "Citizen name must be at least 2 characters").max(100),
  citizenPhone: z
    .string()
    .regex(/^\+?[\d\s\-()\/.]{7,20}$/, "Invalid phone number"),
  citizenEmail: z.string().email("A valid email is required to receive updates"),
  description:  z.string().min(10, "Description must be at least 10 characters").max(5000),
  category:     z.string().min(2).max(100).optional().nullable(),
  priority:     Priority.optional(),
  departmentId: z.string().uuid("Invalid department ID").optional().nullable(),
  tenantSlug:   z.string().min(1, "tenantSlug is required"),
});

// ── FEEDBACK ──────────────────────────────────────────────────────────────
export const feedbackSchema = z.object({
  rating:  z.number().int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  comment: z.string().max(1000, "Comment must be at most 1000 characters").optional(),
});
