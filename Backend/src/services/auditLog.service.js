import { prisma } from "../config/db.js";
import { forTenant } from "../utils/tenantScope.js";
import { getPagination, paginatedResponse } from "../utils/helpers.js";
import { ApiError } from "../utils/ApiError.js";

// ── Allowed filter options ──────────────────────────────────────────────────

const ALLOWED_ENTITY_TYPES = new Set([
  "Complaint",
  "User",
  "Department",
  "Role",
  "Notification",
]);

/**
 * Write an audit log entry.
 * Fire-and-forget safe: always resolves (never throws) so callers can use .catch(() => {}).
 */
export const writeAuditLog = async ({ tenantId, userId, action, entityType, entityId, metadata }) => {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId:     userId ?? null,
        action,
        entityType,
        entityId,
        metadata:   metadata ?? null,
      },
    });
  } catch {
    // Never crash the calling request — audit failure must be silent
  }
};

/**
 * Paginated audit log listing.
 * Accessible to ADMIN and SUPER_ADMIN only (enforced at route level too).
 *
 * Query params:
 *   page, limit          — pagination
 *   action               — exact match e.g. "STATUS_UPDATED"
 *   entityType           — e.g. "Complaint"
 *   entityId             — UUID of the entity
 *   userId               — actor user UUID
 *   from                 — ISO date string (gte)
 *   to                   — ISO date string (lte)
 */
export const listAuditLogs = async (user, query = {}) => {
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const { page, limit, skip } = getPagination(query);
  const { action, entityType, entityId, userId, from, to } = query;

  // Validate entityType to prevent arbitrary DB probing
  if (entityType && !ALLOWED_ENTITY_TYPES.has(entityType)) {
    throw new ApiError(400, `Invalid entityType. Allowed: ${[...ALLOWED_ENTITY_TYPES].join(", ")}`);
  }

  const fromDate = from ? new Date(from) : undefined;
  const toDate   = to   ? new Date(to)   : undefined;

  if (fromDate && isNaN(fromDate.getTime())) throw new ApiError(400, "Invalid 'from' date");
  if (toDate   && isNaN(toDate.getTime()))   throw new ApiError(400, "Invalid 'to' date");
  if (fromDate && toDate && fromDate > toDate) {
    throw new ApiError(400, "'from' must be before 'to'");
  }

  const where = {
    ...forTenant(user),
    ...(action     && { action }),
    ...(entityType && { entityType }),
    ...(entityId   && { entityId }),
    ...(userId     && { userId }),
    ...((fromDate || toDate) && {
      createdAt: {
        ...(fromDate && { gte: fromDate }),
        ...(toDate   && { lte: toDate }),
      },
    }),
  };

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      select: {
        id:         true,
        action:     true,
        entityType: true,
        entityId:   true,
        userId:     true,
        metadata:   true,
        createdAt:  true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return paginatedResponse(logs, total, page, limit);
};

/**
 * Fetch distinct action names for the tenant — for building filter dropdowns.
 * Returns at most 100 distinct values.
 */
export const listAuditActions = async (user) => {
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const rows = await prisma.auditLog.findMany({
    where:    forTenant(user),
    select:   { action: true },
    distinct: ["action"],
    orderBy:  { action: "asc" },
    take:     100,
  });

  return rows.map((r) => r.action);
};
