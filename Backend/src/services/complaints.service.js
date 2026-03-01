import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { forTenant, inTenant } from "../utils/tenantScope.js";
import { generateTrackingId, getPagination, paginatedResponse } from "../utils/helpers.js";
import { assertRoleCanTransition, isTerminal } from "../utils/statusEngine.js";
import { notifyAssignment, notifyStatusChange } from "./notification.service.js";
import { canManageUser } from "../utils/roleHierarchy.js";
import { analyzeComplaint, analyzeSentiment, predictPriority } from "./ai.service.js";
import { sendStatusChangeEmail, sendComplaintConfirmationEmail } from "./email.service.js";

const complaintSummarySelect = {
  id: true,
  trackingId: true,
  citizenName: true,
  citizenPhone: true,
  citizenEmail: true,
  category: true,
  priority: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  department: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
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

const getABACFilter = async (user) => {
  const { userId, role } = user;

  if (role === "CALL_OPERATOR") {
    return { createdById: userId };
  }

  if (role === "OFFICER") {
    return { assignedToId: userId };
  }

  if (role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });
    if (!dbUser?.departmentId) {
      throw new ApiError(403, "Department head is not assigned to any department");
    }
    return { departmentId: dbUser.departmentId };
  }

  return {};
};

const assertComplaintAccess = async (complaint, user) => {
  const { userId, role } = user;

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
    if (!dbUser?.departmentId || complaint.departmentId !== dbUser.departmentId) {
      throw new ApiError(404, "Complaint not found");
    }
    return;
  }
};

export const createComplaint = async (data, user) => {
  const { citizenName, citizenPhone, citizenEmail, description, category, priority, departmentId } = data;

  if (departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, isDeleted: false, isActive: true, ...forTenant(user) },
    });
    if (!dept) throw new ApiError(404, "Department not found");
  }

  // ── AI Analysis ──────────────────────────────────────────────────────────
  // Run BEFORE creating so duplicate detection compares against existing records.
  // analyzeComplaint never throws — returns safe defaults on failure.
  const aiResult = await analyzeComplaint({
    description,
    category:  category ?? null,
    tenantId:  user.tenantId,
    excludeId: null,
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
      description,
      category,
      priority:       resolvedPriority,
      sentimentScore: aiResult.sentimentScore,
      duplicateScore: aiResult.duplicateScore,
      aiScore:        aiResult.aiScore,
      departmentId:   departmentId ?? null,
      createdById:    user.userId,
      ...inTenant(user),
    },
    select: complaintDetailSelect,
  });

  return complaint;
};

export const listComplaints = async (query, user) => {
  const { page, limit, skip } = getPagination(query);
  const { status, priority, category, search } = query;

  const abacFilter = await getABACFilter(user);

  const where = {
    isDeleted: false,
    ...forTenant(user),
    ...abacFilter,
    ...(status && { status }),
    ...(priority && { priority }),
    ...(category && { category }),
    ...(search && {
      OR: [
        { trackingId: { contains: search, mode: "insensitive" } },
        { citizenName: { contains: search, mode: "insensitive" } },
        { citizenPhone: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

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

  return paginatedResponse(complaints, total, page, limit);
};

export const getComplaint = async (id, user) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id, isDeleted: false, ...forTenant(user) },
    select: { ...complaintDetailSelect, createdById: true, assignedToId: true, departmentId: true },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");

  await assertComplaintAccess(complaint, user);

  const { createdById: _c, assignedToId: _a, departmentId: _d, ...safeComplaint } = complaint;
  return safeComplaint;
};

export const getComplaintByTrackingId = async (trackingId) => {
  const complaint = await prisma.complaint.findFirst({
    where: { trackingId, isDeleted: false },
    select: {
      trackingId: true,
      description: true,
      citizenName: true,
      status: true,
      priority: true,
      category: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      department: { select: { name: true } },
    },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");
  return complaint;
};

export const updateComplaint = async (id, data, user) => {
  const { description, category, priority } = data;

  const complaint = await prisma.complaint.findFirst({
    where: { id, isDeleted: false, ...forTenant(user) },
    // Fetch description + category so we can re-score if only one of them changes
    select: {
      id:           true,
      status:       true,
      createdById:  true,
      assignedToId: true,
      departmentId: true,
      description:  true,
      category:     true,
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
  const textChanging    = description !== undefined;
  const categoryChanging = category !== undefined;

  if (textChanging || categoryChanging) {
    const effectiveDesc     = description ?? complaint.description;
    const effectiveCategory = category    ?? complaint.category ?? null;

    const newSentiment  = textChanging
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
      ...(category    !== undefined && { category }),
      // Explicit priority always wins; aiUpdates.priority is only present
      // when priority was NOT passed in the request
      ...(priority !== undefined ? { priority } : {}),
      ...aiUpdates,
    },
    select: complaintDetailSelect,
  });

  return updated;
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
      where: { id: departmentId, isDeleted: false, isActive: true, ...forTenant(user) },
    });
    if (!dept) throw new ApiError(404, "Department not found");

    if (user.role === "DEPARTMENT_HEAD") {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { departmentId: true },
      });
      if (dbUser?.departmentId !== departmentId) {
        throw new ApiError(403, "Department heads can only assign within their own department");
      }
    }
  }

  if (assignedToId) {
    const officer = await prisma.user.findFirst({
      where: {
        id: assignedToId,
        isDeleted: false,
        isActive: true,
        ...forTenant(user),
        role: { type: { in: ["OFFICER", "DEPARTMENT_HEAD", "ADMIN", "SUPER_ADMIN"] } },
      },
      select: { id: true, departmentId: true },
    });
    if (!officer) throw new ApiError(404, "Officer not found or not eligible for assignment");

    if (user.role === "DEPARTMENT_HEAD") {
      const effectiveDeptId = departmentId ?? complaint.departmentId;
      if (effectiveDeptId && officer.departmentId !== effectiveDeptId) {
        throw new ApiError(403, "Officer does not belong to the target department");
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
    notifyAssignment(id, assignedToId, user.userId, updated.trackingId).catch(() => {});
  }

  return updated;
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
    if (!dbUser?.departmentId || complaint.departmentId !== dbUser.departmentId) {
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
    updated.trackingId
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

  return updated;
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
    throw new ApiError(403, "You can only add notes to your assigned complaints");
  }

  if (user.role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { departmentId: true },
    });
    if (!dbUser?.departmentId || complaint.departmentId !== dbUser.departmentId) {
      throw new ApiError(403, "You can only add notes to complaints in your department");
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
    if (!dbUser?.departmentId || complaint.departmentId !== dbUser.departmentId) {
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

export const createPublicComplaint = async (data) => {
  const { citizenName, citizenPhone, citizenEmail, description, category, priority, departmentId, tenantSlug } = data;

  // Resolve tenant from slug
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug, isActive: true },
  });
  if (!tenant) throw new ApiError(404, "Portal not found");

  if (departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, isDeleted: false, isActive: true, tenantId: tenant.id },
    });
    if (!dept) throw new ApiError(404, "Department not found");
  }

  const aiResult = await analyzeComplaint({
    description,
    category:  category ?? null,
    tenantId:  tenant.id,
    excludeId: null,
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
      description,
      category:       category ?? null,
      priority:       resolvedPriority,
      sentimentScore: aiResult.sentimentScore,
      duplicateScore: aiResult.duplicateScore,
      aiScore:        aiResult.aiScore,
      departmentId:   departmentId ?? null,
      createdById:    null,
    },
    select: {
      trackingId: true,
      citizenName: true,
      status: true,
      priority: true,
      category: true,
      createdAt: true,
    },
  });

  // Send confirmation email fire-and-forget
  sendComplaintConfirmationEmail(citizenEmail, citizenName, trackingId).catch(() => {});

  return complaint;
};

// ── COMPLAINT FEEDBACK ────────────────────────────────────────────────────

export const submitFeedback = async (trackingId, { rating, comment }) => {
  const complaint = await prisma.complaint.findFirst({
    where: { trackingId, isDeleted: false },
    select: { id: true, status: true },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");

  if (complaint.status !== "RESOLVED" && complaint.status !== "CLOSED") {
    throw new ApiError(422, "Feedback can only be submitted for resolved or closed complaints");
  }

  // Check for existing feedback (@unique on complaintId)
  const existing = await prisma.complaintFeedback.findUnique({
    where: { complaintId: complaint.id },
  });
  if (existing) throw new ApiError(409, "Feedback has already been submitted for this complaint");

  const feedback = await prisma.complaintFeedback.create({
    data: {
      complaintId: complaint.id,
      rating,
      comment: comment ?? null,
    },
    select: {
      id:          true,
      rating:      true,
      comment:     true,
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
      id:          true,
      rating:      true,
      comment:     true,
      submittedAt: true,
    },
  });

  if (!feedback) throw new ApiError(404, "No feedback has been submitted for this complaint");

  return feedback;
};

// ─── CSV Export ───────────────────────────────────────────────────────────────
const EXPORT_CAP = 10_000;

export const exportComplaints = async (query, user) => {
  const { status, priority, category, search, startDate, endDate, departmentId } = query;

  const abacFilter = await getABACFilter(user);

  const where = {
    isDeleted: false,
    ...forTenant(user),
    ...abacFilter,
    ...(status       && { status }),
    ...(priority     && { priority }),
    ...(category     && { category }),
    ...(departmentId && { departmentId }),
    ...((startDate || endDate) && {
      createdAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate   && { lte: new Date(endDate)   }),
      },
    }),
    ...(search && {
      OR: [
        { trackingId:   { contains: search, mode: "insensitive" } },
        { citizenName:  { contains: search, mode: "insensitive" } },
        { citizenPhone: { contains: search, mode: "insensitive" } },
        { description:  { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const complaints = await prisma.complaint.findMany({
    where,
    select: {
      trackingId:     true,
      citizenName:    true,
      citizenPhone:   true,
      citizenEmail:   true,
      category:       true,
      priority:       true,
      status:         true,
      description:    true,
      aiScore:        true,
      sentimentScore: true,
      duplicateScore: true,
      resolvedAt:     true,
      createdAt:      true,
      updatedAt:      true,
      department: { select: { name: true } },
      assignedTo: { select: { name: true } },
      createdBy:  { select: { name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: EXPORT_CAP,
  });

  return complaints;
};
