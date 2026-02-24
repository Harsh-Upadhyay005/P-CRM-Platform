import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { forTenant, inTenant, assertTenant } from "../utils/tenantScope.js";
import { generateTrackingId, getPagination, paginatedResponse } from "../utils/helpers.js";
import { assertRoleCanTransition, isTerminal } from "../utils/statusEngine.js";
import { notifyAssignment, notifyStatusChange } from "./notification.service.js";
import { canManageUser } from "../utils/roleHierarchy.js";

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

  const trackingId = generateTrackingId();

  const complaint = await prisma.complaint.create({
    data: {
      trackingId,
      citizenName,
      citizenPhone,
      citizenEmail,
      description,
      category,
      priority: priority ?? "MEDIUM",
      departmentId: departmentId ?? null,
      createdById: user.userId,
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
    select: { id: true, status: true, createdById: true, assignedToId: true, departmentId: true },
  });

  if (!complaint) throw new ApiError(404, "Complaint not found");

  if (isTerminal(complaint.status)) {
    throw new ApiError(422, "Cannot update a closed complaint");
  }

  await assertComplaintAccess(complaint, user);

  const updated = await prisma.complaint.update({
    where: { id },
    data: {
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(priority !== undefined && { priority }),
    },
    select: complaintDetailSelect,
  });

  return updated;
};

export const assignComplaint = async (id, data, user) => {
  const { assignedToId, departmentId } = data;

  const complaint = await prisma.complaint.findFirst({
    where: { id, isDeleted: false, ...forTenant(user) },
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
        role: { type: { in: ["OFFICER", "DEPARTMENT_HEAD"] } },
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

export const updateComplaintStatus = async (id, { newStatus }, user) => {
  const complaint = await prisma.complaint.findFirst({
    where: { id, isDeleted: false, ...forTenant(user) },
    select: { id: true, status: true, createdById: true, assignedToId: true, departmentId: true },
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
