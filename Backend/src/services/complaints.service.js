import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { forTenant, inTenant } from "../utils/tenantScope.js";
import {
  generateTrackingId,
  getPagination,
  paginatedResponse,
} from "../utils/helpers.js";
import { assertRoleCanTransition, isTerminal } from "../utils/statusEngine.js";
import {
  notifyAssignment,
  notifyStatusChange,
} from "./notification.service.js";
import { ROLE_RANK } from "../utils/roleHierarchy.js";
import {
  analyzeComplaint,
  analyzeSentiment,
  predictPriority,
} from "./ai.service.js";
import {
  sendStatusChangeEmail,
  sendComplaintConfirmationEmail,
  sendOfficerAssignmentEmail,
} from "./email.service.js";
import { buildSlaSummary, NON_SLA_STATUSES } from "../utils/slaEngine.js";
import {
  buildCategorySlaLookupForComplaints,
  resolveEffectiveSlaHours,
  runComplaintAutomationOnCreate,
} from "./workflow.service.js";
import { localityToStateId } from "./analytics.service.js";

const complaintSummarySelect = {
  id: true,
  tenantId: true,
  trackingId: true,
  citizenName: true,
  citizenPhone: true,
  citizenEmail: true,
  locality: true,
  category: true,
  priority: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  department: { select: { id: true, name: true, slaHours: true } },
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
};

// Attach a computed `slaSummary` field to a complaint object.
// Returns null when the complaint status is terminal or no SLA data is available.
const decorateWithSla = (complaint, policyLookup = new Map()) => {
  if (!complaint) return complaint;
  const slaHours = resolveEffectiveSlaHours(complaint, policyLookup);
  const slaSummary =
    slaHours && !NON_SLA_STATUSES.includes(complaint.status)
      ? buildSlaSummary(complaint.createdAt, slaHours)
      : null;
  return { ...complaint, slaSummary, effectiveSlaHours: slaHours };
};

const decorateWithSlaBatch = async (complaints) => {
  const validComplaints = (complaints ?? []).filter(Boolean);
  if (validComplaints.length === 0) return [];
  const policyLookup =
    await buildCategorySlaLookupForComplaints(validComplaints);
  return validComplaints.map((complaint) =>
    decorateWithSla(complaint, policyLookup),
  );
};

const complaintDetailSelect = {
  ...complaintSummarySelect,
  description: true,
  aiScore: true,
  sentimentScore: true,
  duplicateScore: true,
  statusHistory: {
    orderBy: { changedAt: "asc" },
    select: {
      id: true,
      oldStatus: true,
      newStatus: true,
      changedAt: true,
      changedBy: { select: { id: true, name: true } },
    },
  },
};

const ADDRESS_ALIAS_CODE_MAP = {
  TG: "TS",
  UK: "UT",
  OD: "OR",
};

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanAddressToken = (value) =>
  String(value || "")
    .trim()
    .replace(/\b\d{6}\b/g, "")
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeStateToken = (value) =>
  cleanAddressToken(value).toLowerCase().replace(/\./g, "").trim();

const normalizeDistrictLabel = (value) =>
  cleanAddressToken(value)
    .toLowerCase()
    .replace(/\bdistrict\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

const buildStateHints = (tenant) => {
  const hints = [];
  const stateCode = normalizeStateToken(tenant?.stateCode || "").toUpperCase();
  const stateLabel = normalizeStateToken(tenant?.stateLabel || "");

  if (stateCode) {
    hints.push(stateCode.toLowerCase());
    const aliasCode = Object.entries(ADDRESS_ALIAS_CODE_MAP).find(
      ([, mapped]) => mapped === stateCode,
    )?.[0];
    if (aliasCode) hints.push(aliasCode.toLowerCase());
  }
  if (stateLabel) hints.push(stateLabel);

  return [...new Set(hints)];
};

const inferDistrictFromAddress = (address, stateHints = []) => {
  if (!address) return null;

  const rawTokens = String(address)
    .split(",")
    .map(cleanAddressToken)
    .filter(Boolean);

  if (!rawTokens.length) return null;

  const normalizedTokens = rawTokens.map((token) => token.toLowerCase());
  const normalizedStateHints = stateHints.map(normalizeStateToken);
  const stateIndex = normalizedTokens.findIndex((token) =>
    normalizedStateHints.some((hint) => normalizeStateToken(token) === hint),
  );

  if (stateIndex <= 0) return null;
  return rawTokens[stateIndex - 1] ?? null;
};

const inferTenantDistrict = (tenant) => {
  if (cleanAddressToken(tenant?.districtLabel)) {
    return cleanAddressToken(tenant.districtLabel);
  }

  const stateHints = buildStateHints(tenant);
  for (const area of tenant?.areas ?? []) {
    const inferred = inferDistrictFromAddress(area, stateHints);
    if (inferred) return inferred;
  }

  return null;
};

const assertComplaintDistrictMatchesTenant = (locality, tenant) => {
  const tenantDistrictRaw = inferTenantDistrict(tenant);
  const tenantDistrict = normalizeDistrictLabel(tenantDistrictRaw);
  if (!tenantDistrict) return;

  const stateHints = buildStateHints(tenant);
  const inferredComplaintDistrict = inferDistrictFromAddress(locality, stateHints);
  const complaintDistrictSource = inferredComplaintDistrict || locality;
  const complaintDistrict = normalizeDistrictLabel(complaintDistrictSource);

  const districtPattern = new RegExp(
    `(^|\\b)${escapeRegExp(tenantDistrict)}(\\b|$)`,
    "i",
  );

  if (!districtPattern.test(complaintDistrict)) {
    throw new ApiError(
      400,
      `Complaint locality must belong to district \"${tenantDistrictRaw}\" for this tenant`,
    );
  }
};

const getABACFilter = async (user) => {
  const { userId, role } = user;

  if (role === "CITIZEN") {
    return { createdById: userId };
  }

  if (role === "CALL_OPERATOR") {
    return { createdById: userId };
  }

  if (role === "OFFICER") {
    return { assignedToId: userId };
  }

  if (role === "DEPARTMENT_HEAD") {
    if (!user.departmentId) {
      throw new ApiError(
        403,
        "Department head is not assigned to any department",
      );
    }
    return { departmentId: user.departmentId };
  }

  return {};
};

const assertComplaintAccess = async (complaint, user) => {
  const { userId, role } = user;

  if (role === "CITIZEN") {
    if (complaint.createdById !== userId) {
      throw new ApiError(404, "Complaint not found");
    }
    return;
  }

  if (role === "CALL_OPERATOR") {
    if (complaint.createdById !== userId) {
      throw new ApiError(404, "Complaint not found");
    }
    return;
  }

  if (role === "OFFICER") {
    if (complaint.assignedToId !== userId) {
      throw new ApiError(404, "Complaint not found");
    }
    return;
  }

  if (role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });
    if (
      !dbUser?.departmentId ||
      complaint.departmentId !== dbUser.departmentId
    ) {
      throw new ApiError(404, "Complaint not found");
    }
    return;
  }
};

export const createComplaint = async (data, user) => {
  const {
    citizenName,
    citizenPhone,
    citizenEmail,
    locality,
    description,
    category,
    priority,
    departmentId,
  } = data;

  let resolvedDepartmentId = departmentId ?? null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: {
      id: true,
      isActive: true,
      stateCode: true,
      stateLabel: true,
      districtLabel: true,
      areas: true,
    },
  });

  if (!tenant || !tenant.isActive) {
    throw new ApiError(404, "Tenant not found");
  }

  assertComplaintDistrictMatchesTenant(locality, tenant);

  
  if (!resolvedDepartmentId && locality) {
    const matchedDept = await matchLocalityToDepartment(
      locality,
      user.tenantId,
    );
    if (matchedDept) {
      resolvedDepartmentId = matchedDept.id;
    }
  }

  // Fallback: Try category-based routing if locality didn't match
  if (!resolvedDepartmentId && category) {
    const matchedDept = await matchCategoryToDepartment(
      category,
      user.tenantId,
    );
    if (matchedDept) {
      resolvedDepartmentId = matchedDept.id;
    }
  }

  if (resolvedDepartmentId) {
    const dept = await prisma.department.findFirst({
      where: {
        id: resolvedDepartmentId,
        isDeleted: false,
        isActive: true,
        ...forTenant(user),
      },
    });
    if (!dept) throw new ApiError(404, "Department not found");
  }

  // ── AI Analysis ──────────────────────────────────────────────────────────
  // Run BEFORE creating so duplicate detection compares against existing records.
  // analyzeComplaint never throws — returns safe defaults on failure.
  const aiResult = await analyzeComplaint({
    description,
    category: category ?? null,
    tenantId: user.tenantId,
    excludeId: null,
    locality: locality ?? null,
  });

  // Use AI-suggested priority only when the caller did not explicitly provide one
  const resolvedPriority = priority ?? aiResult.suggestedPriority ?? "MEDIUM";

  const trackingId = generateTrackingId();

  const complaint = await prisma.complaint.create({
    data: {
      trackingId,
      citizenName,
      citizenPhone,
      citizenEmail,
      locality: locality ?? null,
      description,
      category,
      priority: resolvedPriority,
      sentimentScore: aiResult.sentimentScore,
      duplicateScore: aiResult.duplicateScore,
      aiScore: aiResult.aiScore,
      departmentId: resolvedDepartmentId,
      createdById: user.userId,
      ...inTenant(user),
    },
    select: complaintDetailSelect,
  });

  // Send confirmation email to citizen (fire-and-forget)
  if (citizenEmail) {
    sendComplaintConfirmationEmail(citizenEmail, citizenName, trackingId).catch(
      () => {},
    );
  }

  runComplaintAutomationOnCreate(complaint.id).catch((err) =>
    console.error(
      `[Automation] Failed for complaint ${complaint.id}:`,
      err.message,
    ),
  );

  const refreshedComplaint = await prisma.complaint.findUnique({
    where: { id: complaint.id },
    select: complaintDetailSelect,
  });

  const [decorated] = await decorateWithSlaBatch([
    refreshedComplaint ?? complaint,
  ]);
  return decorated;
};

const TERMINAL_STATUSES = ["RESOLVED", "CLOSED"];

export const listComplaints = async (query, user) => {
  const { page, limit, skip } = getPagination(query);
  const {
    status,
    priority,
    category,
    search,
    slaBreached,
    assignedToId,
    stateId,
    tenantId: tenantIdParam,
    departmentId,
  } = query;

  const tenantFilter =
    user.role === "SUPER_ADMIN" && tenantIdParam
      ? { tenantId: tenantIdParam }
      : forTenant(user);

  const abacFilter = await getABACFilter(user);

  const explicitDeptFilter = departmentId && user.role !== "DEPARTMENT_HEAD" 
    ? { departmentId } 
    : {};

  const where = {
    isDeleted: false,
    ...tenantFilter,
    ...abacFilter,
    ...explicitDeptFilter,
    ...(search && {
      OR: [
        { trackingId: { contains: search, mode: "insensitive" } },
        { citizenName: { contains: search, mode: "insensitive" } },
        { citizenPhone: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { locality: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  if (slaBreached === "true" || stateId) {
    const BATCH_SIZE = 500;
    let batchSkip = 0;
    let matchedCount = 0;
    const paged = [];

    while (true) {
      const complaintsBatch = await prisma.complaint.findMany({
        where,
        select: complaintSummarySelect,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        skip: batchSkip,
        take: BATCH_SIZE,
      });

      if (complaintsBatch.length === 0) break;

      const decoratedBatch = await decorateWithSlaBatch(complaintsBatch);

      for (const complaint of decoratedBatch) {
        if (slaBreached === "true" && !complaint.slaSummary?.breached) continue;
        if (stateId && localityToStateId(complaint.locality) !== stateId) continue;

        if (matchedCount >= skip && paged.length < limit) {
          paged.push(complaint);
        }
        matchedCount++;
      }

      batchSkip += complaintsBatch.length;
    }

    return paginatedResponse(paged, matchedCount, page, limit);
  }

  const [complaints, total] = await prisma.$transaction([
    prisma.complaint.findMany({
      where,
      select: complaintSummarySelect,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.complaint.count({ where }),
  ]);

  const decorated = await decorateWithSlaBatch(complaints);
  return paginatedResponse(decorated, total, page, limit);
};

export const getComplaint = async (id, user) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id, isDeleted: false, ...forTenant(user) },
    select: {
      ...complaintDetailSelect,
      createdById: true,
      assignedToId: true,
      departmentId: true,
    },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");

  await assertComplaintAccess(complaint, user);

  const [decorated] = await decorateWithSlaBatch([complaint]);

  const {
    createdById: _c,
    assignedToId: _a,
    departmentId: _d,
    ...safeComplaint
  } = decorated;
  return safeComplaint;
};

export const getComplaintByTrackingId = async (trackingId) => {
  const complaint = await prisma.complaint.findFirst({
    where: { trackingId, isDeleted: false },
    select: {
      tenantId: true,
      trackingId: true,
      description: true,
      citizenName: true,
      status: true,
      priority: true,
      category: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      department: { select: { name: true, slaHours: true } },
    },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");
  const [decorated] = await decorateWithSlaBatch([complaint]);
  return decorated;
};

export const updateComplaint = async (id, data, user) => {
  const { description, category, priority } = data;

  const complaint = await prisma.complaint.findFirst({
    where: { id, isDeleted: false, ...forTenant(user) },
    // Fetch description + category so we can re-score if only one of them changes
    select: {
      id: true,
      status: true,
      createdById: true,
      assignedToId: true,
      departmentId: true,
      description: true,
      category: true,
    },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");

  if (isTerminal(complaint.status)) {
    throw new ApiError(422, "Cannot update a closed complaint");
  }

  await assertComplaintAccess(complaint, user);

  // ── Re-run AI when text content changes ───────────────────────────────────
  // Use whichever field is being updated; fall back to stored value for the other.
  // Duplicate score is NOT re-computed — this complaint already exists.
  let aiUpdates = {};
  const textChanging = description !== undefined;
  const categoryChanging = category !== undefined;

  if (textChanging || categoryChanging) {
    const effectiveDesc = description ?? complaint.description;
    const effectiveCategory = category ?? complaint.category ?? null;

    const newSentiment = textChanging
      ? analyzeSentiment(effectiveDesc)
      : undefined;

    const { suggestedPriority, aiScore: newAiScore } = predictPriority(
      effectiveDesc,
      effectiveCategory,
    );

    aiUpdates = {
      ...(newSentiment !== undefined && { sentimentScore: newSentiment }),
      aiScore: newAiScore,
      // Only override priority with AI suggestion if the caller did NOT
      // explicitly provide a priority in this request
      ...(priority === undefined && { priority: suggestedPriority }),
    };
  }

  const updated = await prisma.complaint.update({
    where: { id },
    data: {
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      // Explicit priority always wins; aiUpdates.priority is only present
      // when priority was NOT passed in the request
      ...(priority !== undefined ? { priority } : {}),
      ...aiUpdates,
    },
    select: complaintDetailSelect,
  });

  const [decorated] = await decorateWithSlaBatch([updated]);
  return decorated;
};

export const assignComplaint = async (id, data, user) => {
  const { assignedToId, departmentId } = data;

  const abacFilter = await getABACFilter(user);
  const complaint = await prisma.complaint.findFirst({
    where: { id, isDeleted: false, ...forTenant(user), ...abacFilter },
    select: { id: true, status: true, departmentId: true },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");

  if (isTerminal(complaint.status)) {
    throw new ApiError(422, "Cannot assign a closed complaint");
  }

  if (departmentId) {
    const dept = await prisma.department.findFirst({
      where: {
        id: departmentId,
        isDeleted: false,
        isActive: true,
        ...forTenant(user),
      },
    });
    if (!dept) throw new ApiError(404, "Department not found");

    if (user.role === "DEPARTMENT_HEAD") {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { departmentId: true },
      });
      if (dbUser?.departmentId !== departmentId) {
        throw new ApiError(
          403,
          "Department heads can only assign within their own department",
        );
      }
    }
  }

  let officerDetails = null; // cached for email after transaction

  if (assignedToId) {
    const officer = await prisma.user.findFirst({
      where: {
        id: assignedToId,
        isDeleted: false,
        isActive: true,
        ...forTenant(user),
        role: { type: { notIn: ["CALL_OPERATOR", "CITIZEN"] } },
      },
      select: {
        id: true,
        departmentId: true,
        name: true,
        email: true,
        role: { select: { type: true } },
      },
    });
    if (!officer)
      throw new ApiError(
        404,
        "Officer not found or not eligible for assignment",
      );

    // Prevent assigning to a role of higher rank than the actor
    const actorRank = ROLE_RANK[user.role] ?? 0;
    const officerRank = ROLE_RANK[officer.role.type] ?? 0;
    if (officerRank > actorRank) {
      throw new ApiError(
        403,
        "You cannot assign a complaint to a user with a higher role than your own",
      );
    }

    officerDetails = { name: officer.name, email: officer.email };

    if (user.role === "DEPARTMENT_HEAD") {
      const effectiveDeptId = departmentId ?? complaint.departmentId;
      if (effectiveDeptId && officer.departmentId !== effectiveDeptId) {
        throw new ApiError(
          403,
          "Officer does not belong to the target department",
        );
      }
    }
  }

  const targetDept = departmentId ?? complaint.departmentId;
  const newStatus = complaint.status === "OPEN" ? "ASSIGNED" : complaint.status;

  const [updated] = await prisma.$transaction([
    prisma.complaint.update({
      where: { id },
      data: {
        ...(assignedToId !== undefined && { assignedToId }),
        ...(departmentId !== undefined && { departmentId }),
        status: newStatus,
      },
      select: complaintDetailSelect,
    }),
    ...(newStatus !== complaint.status
      ? [
          prisma.complaintStatusHistory.create({
            data: {
              complaintId: id,
              oldStatus: complaint.status,
              newStatus,
              changedById: user.userId,
            },
          }),
        ]
      : []),
  ]);

  if (assignedToId) {
    notifyAssignment(
      id,
      assignedToId,
      updated.createdBy?.id ?? null,
      user.userId,
      updated.trackingId,
    ).catch(() => {});

    // Email the officer who was assigned
    if (officerDetails?.email) {
      sendOfficerAssignmentEmail(
        officerDetails.email,
        officerDetails.name,
        updated.trackingId,
        updated.category ?? null,
        updated.priority ?? null,
      ).catch(() => {});
    }
  }

  // Email citizen when status changed to ASSIGNED (OPEN → ASSIGNED)
  if (newStatus !== complaint.status && updated.citizenEmail) {
    sendStatusChangeEmail(
      updated.citizenEmail,
      updated.citizenName,
      updated.trackingId,
      complaint.status,
      newStatus,
    ).catch(() => {});
  }

  const [decorated] = await decorateWithSlaBatch([updated]);
  return decorated;
};

export const updateComplaintStatus = async (id, { newStatus, note }, user) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id, isDeleted: false, ...forTenant(user) },
    select: {
      id: true,
      status: true,
      createdById: true,
      assignedToId: true,
      departmentId: true,
      citizenEmail: true,
      citizenName: true,
      trackingId: true,
    },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");

  if (user.role === "OFFICER" && complaint.assignedToId !== user.userId) {
    throw new ApiError(404, "Complaint not found");
  }

  if (user.role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { departmentId: true },
    });
    if (
      !dbUser?.departmentId ||
      complaint.departmentId !== dbUser.departmentId
    ) {
      throw new ApiError(404, "Complaint not found");
    }
  }

  assertRoleCanTransition(user.role, complaint.status, newStatus);

  const resolvedAt =
    newStatus === "RESOLVED" || newStatus === "CLOSED" ? new Date() : undefined;

  const [updated] = await prisma.$transaction([
    prisma.complaint.update({
      where: { id },
      data: {
        status: newStatus,
        ...(resolvedAt && { resolvedAt }),
      },
      select: complaintDetailSelect,
    }),
    prisma.complaintStatusHistory.create({
      data: {
        complaintId: id,
        oldStatus: complaint.status,
        newStatus,
        changedById: user.userId,
      },
    }),
    ...(note?.trim()
      ? [
          prisma.internalNote.create({
            data: { complaintId: id, userId: user.userId, note: note.trim() },
          }),
        ]
      : []),
  ]);

  notifyStatusChange(
    id,
    complaint.status,
    newStatus,
    complaint.createdById,
    complaint.assignedToId,
    user.userId,
    updated.trackingId,
  ).catch(() => {});

  // Fire-and-forget status change email to citizen
  if (complaint.citizenEmail) {
    sendStatusChangeEmail(
      complaint.citizenEmail,
      complaint.citizenName,
      complaint.trackingId,
      complaint.status,
      newStatus,
    ).catch(() => {});
  }

  const [decorated] = await decorateWithSlaBatch([updated]);
  return decorated;
};

export const softDeleteComplaint = async (id, user) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id, isDeleted: false, ...forTenant(user) },
    select: { id: true },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");

  await prisma.complaint.update({
    where: { id },
    data: { isDeleted: true },
  });
};

export const addInternalNote = async (complaintId, { note }, user) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id: complaintId, isDeleted: false, ...forTenant(user) },
    select: { id: true, assignedToId: true, departmentId: true },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");

  if (user.role === "OFFICER" && complaint.assignedToId !== user.userId) {
    throw new ApiError(
      403,
      "You can only add notes to your assigned complaints",
    );
  }

  if (user.role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { departmentId: true },
    });
    if (
      !dbUser?.departmentId ||
      complaint.departmentId !== dbUser.departmentId
    ) {
      throw new ApiError(
        403,
        "You can only add notes to complaints in your department",
      );
    }
  }

  const internalNote = await prisma.internalNote.create({
    data: {
      complaintId,
      userId: user.userId,
      note,
    },
    select: {
      id: true,
      note: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    },
  });

  return internalNote;
};

export const getInternalNotes = async (complaintId, user) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id: complaintId, isDeleted: false, ...forTenant(user) },
    select: { id: true, assignedToId: true, departmentId: true },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");

  if (user.role === "OFFICER" && complaint.assignedToId !== user.userId) {
    throw new ApiError(404, "Complaint not found");
  }

  if (user.role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { departmentId: true },
    });
    if (
      !dbUser?.departmentId ||
      complaint.departmentId !== dbUser.departmentId
    ) {
      throw new ApiError(404, "Complaint not found");
    }
  }

  const notes = await prisma.internalNote.findMany({
    where: { complaintId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      note: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    },
  });

  return notes;
};

// ── CITIZEN SELF-FILING (public — no auth) ────────────────────────────────

const matchLocalityToDepartment = async (locality, tenantId) => {
  if (!locality) return null;

  const localityLower = locality.toLowerCase();

  const departments = await prisma.department.findMany({
    where: {
      tenantId,
      isActive: true,
      isDeleted: false,
      serviceAreas: { isEmpty: false },
    },
    select: {
      id: true,
      name: true,
      serviceAreas: true,
    },
  });

  for (const dept of departments) {
    for (const area of dept.serviceAreas) {
      const areaLower = area.toLowerCase();
      if (
        localityLower === areaLower ||
        localityLower.includes(areaLower) ||
        areaLower.includes(localityLower)
      ) {
        return { id: dept.id, name: dept.name };
      }
    }
  }

  return null;
};

/**
 * Match complaint category to department in the SAME tenant.
 * Returns the first department in that tenant with matching category tag.
 * CRITICAL: Always scoped by tenantId to prevent cross-tenant routing.
 */
const matchCategoryToDepartment = async (category, tenantId) => {
  if (!category) return null;

  const categoryLower = category.toLowerCase();

  const departments = await prisma.department.findMany({
    where: {
      tenantId,  // ← CRITICAL: Restrict to same tenant
      isActive: true,
      isDeleted: false,
      categoryTags: { isEmpty: false },
    },
    select: {
      id: true,
      name: true,
      categoryTags: true,
    },
  });

  // Find first department in this tenant that handles this category
  for (const dept of departments) {
    const hasCategory = dept.categoryTags.some(
      (tag) => tag.toLowerCase() === categoryLower
    );
    if (hasCategory) {
      return { id: dept.id, name: dept.name };
    }
  }

  return null;
};

export const createPublicComplaint = async (data) => {
  const {
    citizenName,
    citizenPhone,
    citizenEmail,
    locality,
    description,
    category,
    priority,
    departmentId,
    tenantSlug,
  } = data;

  // Resolve tenant from slug
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug, isActive: true },
  });
  if (!tenant) throw new ApiError(404, "Portal not found");

  assertComplaintDistrictMatchesTenant(locality, tenant);

  let resolvedDepartmentId = departmentId ?? null;

  // Auto-route: if no department specified, match locality to service areas
  if (!resolvedDepartmentId && locality) {
    const matchedDept = await matchLocalityToDepartment(locality, tenant.id);
    if (matchedDept) {
      resolvedDepartmentId = matchedDept.id;
    }
  }

  if (resolvedDepartmentId) {
    const dept = await prisma.department.findFirst({
      where: {
        id: resolvedDepartmentId,
        isDeleted: false,
        isActive: true,
        tenantId: tenant.id,
      },
    });
    if (!dept) throw new ApiError(404, "Department not found");
  }

  const aiResult = await analyzeComplaint({
    description,
    category: category ?? null,
    tenantId: tenant.id,
    excludeId: null,
    locality: locality ?? null,
  });

  const resolvedPriority = priority ?? aiResult.suggestedPriority ?? "MEDIUM";
  const trackingId = generateTrackingId();

  const complaint = await prisma.complaint.create({
    data: {
      trackingId,
      tenantId: tenant.id,
      citizenName,
      citizenPhone,
      citizenEmail,
      locality: locality ?? null,
      description,
      category: category ?? null,
      priority: resolvedPriority,
      sentimentScore: aiResult.sentimentScore,
      duplicateScore: aiResult.duplicateScore,
      aiScore: aiResult.aiScore,
      departmentId: resolvedDepartmentId,
      createdById: null,
    },
    select: {
      id: true,
      trackingId: true,
      citizenName: true,
      status: true,
      priority: true,
      category: true,
      createdAt: true,
      tenantId: true,
      department: { select: { name: true, slaHours: true } },
    },
  });

  // Send confirmation email fire-and-forget
  sendComplaintConfirmationEmail(citizenEmail, citizenName, trackingId).catch(
    () => {},
  );

  runComplaintAutomationOnCreate(complaint.id).catch((err) =>
    console.error(
      `[Automation] Failed for complaint ${complaint.id}:`,
      err.message,
    ),
  );

  const refreshed = await prisma.complaint.findUnique({
    where: { id: complaint.id },
    select: {
      tenantId: true,
      trackingId: true,
      citizenName: true,
      status: true,
      priority: true,
      category: true,
      createdAt: true,
      department: { select: { name: true, slaHours: true } },
    },
  });

  const [decorated] = await decorateWithSlaBatch([refreshed ?? complaint]);
  return decorated;
};

// ── PUBLIC TENANT / DEPARTMENT LOOKUP ────────────────────────────────────

export const searchPublicTenants = async ({ q = "" } = {}) => {
  const search = String(q).trim().slice(0, 100);
  return prisma.tenant.findMany({
    where: {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { name: true, slug: true },
    take: search ? 20 : 500,
    orderBy: { name: "asc" },
  });
};

export const getPublicDepartments = async (slug) => {
  const tenant = await prisma.tenant.findFirst({
    where: { slug, isActive: true },
  });
  if (!tenant) throw new ApiError(404, "Portal not found");
  return prisma.department.findMany({
    where: { tenantId: tenant.id, isActive: true, isDeleted: false },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
};

// ── COMPLAINT FEEDBACK ────────────────────────────────────────────────────

export const submitFeedback = async (id, { rating, comment }, user) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id, isDeleted: false, ...forTenant(user) },
    select: { id: true, status: true, createdById: true },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");

  if (complaint.status !== "RESOLVED" && complaint.status !== "CLOSED") {
    throw new ApiError(
      422,
      "Feedback can only be submitted for resolved or closed complaints",
    );
  }

  // Only the staff member who originally filed the complaint may submit feedback
  if (complaint.createdById !== user.userId) {
    throw new ApiError(
      403,
      "Only the person who filed this complaint can submit feedback",
    );
  }

  // Check for existing feedback (@unique on complaintId)
  const existing = await prisma.complaintFeedback.findUnique({
    where: { complaintId: complaint.id },
  });
  if (existing)
    throw new ApiError(
      409,
      "Feedback has already been submitted for this complaint",
    );

  const feedback = await prisma.complaintFeedback.create({
    data: {
      complaintId: complaint.id,
      rating,
      comment: comment ?? null,
    },
    select: {
      id: true,
      rating: true,
      comment: true,
      submittedAt: true,
    },
  });

  return feedback;
};

export const getFeedback = async (complaintId, user) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id: complaintId, isDeleted: false, ...forTenant(user) },
    select: { id: true, assignedToId: true, departmentId: true },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");

  await assertComplaintAccess(complaint, user);

  const feedback = await prisma.complaintFeedback.findUnique({
    where: { complaintId },
    select: {
      id: true,
      rating: true,
      comment: true,
      submittedAt: true,
    },
  });

  if (!feedback)
    throw new ApiError(
      404,
      "No feedback has been submitted for this complaint",
    );

  return feedback;
};

// ─── CSV Export ───────────────────────────────────────────────────────────────
const EXPORT_CAP = 10_000;

export const exportComplaints = async (query, user) => {
  const {
    status,
    priority,
    category,
    search,
    startDate,
    endDate,
    departmentId,
    tenantId: tenantIdParam,
  } = query;

  const tenantFilter =
    user.role === "SUPER_ADMIN" && tenantIdParam
      ? { tenantId: tenantIdParam }
      : forTenant(user);

  const abacFilter = await getABACFilter(user);

  const where = {
    isDeleted: false,
    ...tenantFilter,
    ...abacFilter,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(category && { category }),
    ...(departmentId && { departmentId }),
    ...((startDate || endDate) && {
      createdAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      },
    }),
    ...(search && {
      OR: [
        { trackingId: { contains: search, mode: "insensitive" } },
        { citizenName: { contains: search, mode: "insensitive" } },
        { citizenPhone: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const complaints = await prisma.complaint.findMany({
    where,
    select: {
      trackingId: true,
      citizenName: true,
      citizenPhone: true,
      citizenEmail: true,
      category: true,
      priority: true,
      status: true,
      description: true,
      aiScore: true,
      sentimentScore: true,
      duplicateScore: true,
      resolvedAt: true,
      createdAt: true,
      updatedAt: true,
      department: { select: { name: true } },
      assignedTo: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: EXPORT_CAP,
  });

  return complaints;
};
