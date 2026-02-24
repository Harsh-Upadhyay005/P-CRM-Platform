import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { forTenant } from "../utils/tenantScope.js";
import { isSlaBreached, NON_SLA_STATUSES } from "../utils/slaEngine.js";

const getABACFilter = async (user) => {
  const { userId, role } = user;

  if (role === "CALL_OPERATOR") return { createdById: userId };
  if (role === "OFFICER")       return { assignedToId: userId };

  if (role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where:  { id: userId },
      select: { departmentId: true },
    });
    if (!dbUser?.departmentId) {
      throw new ApiError(403, "Department head is not assigned to any department");
    }
    return { departmentId: dbUser.departmentId };
  }

  return {};
};

const avgResolutionMs = (complaints) => {
  const resolved = complaints.filter((c) => c.resolvedAt);
  if (resolved.length === 0) return null;
  const totalMs = resolved.reduce(
    (sum, c) => sum + (new Date(c.resolvedAt) - new Date(c.createdAt)), 0
  );
  return Math.round(totalMs / resolved.length);
};

const msToHuman = (ms) => {
  if (ms === null) return null;
  const days    = Math.floor(ms / 86_400_000);
  const hours   = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return { days, hours, minutes, totalHours: +(ms / 3_600_000).toFixed(1) };
};

export const getOverview = async (user, query = {}) => {
  const [abacFilter, tenantFilter] = await Promise.all([
    getABACFilter(user),
    Promise.resolve(forTenant(user)),
  ]);

  const baseWhere = { isDeleted: false, ...tenantFilter, ...abacFilter };

  const [statusGroups, priorityGroups] = await Promise.all([
    prisma.complaint.groupBy({
      by:    ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.complaint.groupBy({
      by:    ["priority"],
      where: baseWhere,
      _count: { _all: true },
    }),
  ]);

  const total = statusGroups.reduce((s, g) => s + g._count._all, 0);

  const byStatus = Object.fromEntries(
    statusGroups.map((g) => [g.status, g._count._all])
  );
  const byPriority = Object.fromEntries(
    priorityGroups.map((g) => [g.priority, g._count._all])
  );

  const activeComplaints = await prisma.complaint.findMany({
    where: {
      ...baseWhere,
      status: { notIn: NON_SLA_STATUSES },
    },
    select: {
      id:         true,
      createdAt:  true,
      department: { select: { slaHours: true } },
    },
  });

  const slaBreachedCount = activeComplaints.filter((c) =>
    isSlaBreached(c.createdAt, c.department?.slaHours ?? 48)
  ).length;

  const activeCount = activeComplaints.length;
  const slaBreachPct = activeCount > 0
    ? +((slaBreachedCount / activeCount) * 100).toFixed(1)
    : 0;

  const resolvedComplaints = await prisma.complaint.findMany({
    where: {
      ...baseWhere,
      status:      { in: ["RESOLVED", "CLOSED"] },
      resolvedAt:  { not: null },
    },
    select: { createdAt: true, resolvedAt: true },
  });

  const avgResMs = avgResolutionMs(resolvedComplaints);

  return {
    total,
    byStatus: {
      OPEN:        byStatus.OPEN        ?? 0,
      ASSIGNED:    byStatus.ASSIGNED    ?? 0,
      IN_PROGRESS: byStatus.IN_PROGRESS ?? 0,
      ESCALATED:   byStatus.ESCALATED   ?? 0,
      RESOLVED:    byStatus.RESOLVED    ?? 0,
      CLOSED:      byStatus.CLOSED      ?? 0,
    },
    byPriority: {
      LOW:      byPriority.LOW      ?? 0,
      MEDIUM:   byPriority.MEDIUM   ?? 0,
      HIGH:     byPriority.HIGH     ?? 0,
      CRITICAL: byPriority.CRITICAL ?? 0,
    },
    sla: {
      activeComplaints:   activeCount,
      breachedCount:      slaBreachedCount,
      breachPercentage:   slaBreachPct,
    },
    avgResolutionTime: msToHuman(avgResMs),
    resolvedCount:     resolvedComplaints.length,
  };
};

export const getDepartmentStats = async (user) => {
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const tenantFilter = forTenant(user);
  const baseWhere    = { isDeleted: false, ...tenantFilter };

  const departments = await prisma.department.findMany({
    where:  { isDeleted: false, ...tenantFilter },
    select: { id: true, name: true, slug: true, slaHours: true },
  });

  if (departments.length === 0) return [];

  const grouped = await prisma.complaint.groupBy({
    by:    ["departmentId", "status"],
    where: { ...baseWhere, departmentId: { not: null } },
    _count: { _all: true },
  });

  const activeComplaints = await prisma.complaint.findMany({
    where: {
      ...baseWhere,
      status: { notIn: NON_SLA_STATUSES },
      departmentId: { not: null },
    },
    select: {
      departmentId: true,
      createdAt:    true,
      department:   { select: { slaHours: true } },
    },
  });

  const resolvedComplaints = await prisma.complaint.findMany({
    where: {
      ...baseWhere,
      status:      { in: ["RESOLVED", "CLOSED"] },
      resolvedAt:  { not: null },
      departmentId: { not: null },
    },
    select: { departmentId: true, createdAt: true, resolvedAt: true },
  });

  const byDeptStatus    = {};
  const byDeptActive    = {};
  const byDeptResolved  = {};

  for (const row of grouped) {
    if (!byDeptStatus[row.departmentId]) byDeptStatus[row.departmentId] = {};
    byDeptStatus[row.departmentId][row.status] = row._count._all;
  }
  for (const c of activeComplaints) {
    if (!byDeptActive[c.departmentId]) byDeptActive[c.departmentId] = [];
    byDeptActive[c.departmentId].push(c);
  }
  for (const c of resolvedComplaints) {
    if (!byDeptResolved[c.departmentId]) byDeptResolved[c.departmentId] = [];
    byDeptResolved[c.departmentId].push(c);
  }

  return departments.map((dept) => {
    const statusMap  = byDeptStatus[dept.id]  ?? {};
    const active     = byDeptActive[dept.id]  ?? [];
    const resolved   = byDeptResolved[dept.id] ?? [];

    const total = Object.values(statusMap).reduce((s, n) => s + n, 0);
    const slaBreached = active.filter((c) =>
      isSlaBreached(c.createdAt, dept.slaHours)
    ).length;

    return {
      department: { id: dept.id, name: dept.name, slug: dept.slug, slaHours: dept.slaHours },
      total,
      byStatus: {
        OPEN:        statusMap.OPEN        ?? 0,
        ASSIGNED:    statusMap.ASSIGNED    ?? 0,
        IN_PROGRESS: statusMap.IN_PROGRESS ?? 0,
        ESCALATED:   statusMap.ESCALATED   ?? 0,
        RESOLVED:    statusMap.RESOLVED    ?? 0,
        CLOSED:      statusMap.CLOSED      ?? 0,
      },
      sla: {
        activeCount:  active.length,
        breachedCount: slaBreached,
        breachPct:    active.length > 0
          ? +((slaBreached / active.length) * 100).toFixed(1)
          : 0,
      },
      avgResolutionTime: msToHuman(avgResolutionMs(resolved)),
    };
  });
};

export const getTrends = async (user, query = {}) => {
  const days = Math.min(Math.max(parseInt(query.days) || 30, 7), 90);

  const [abacFilter, tenantFilter] = await Promise.all([
    getABACFilter(user),
    Promise.resolve(forTenant(user)),
  ]);

  const since    = new Date(Date.now() - days * 86_400_000);
  const baseWhere = {
    isDeleted: false,
    ...tenantFilter,
    ...abacFilter,
    createdAt: { gte: since },
  };

  const complaints = await prisma.complaint.findMany({
    where:  baseWhere,
    select: { createdAt: true, status: true, priority: true },
    orderBy: { createdAt: "asc" },
  });

  const buckets = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { date: key, total: 0, resolved: 0, escalated: 0 };
  }

  for (const c of complaints) {
    const key = new Date(c.createdAt).toISOString().slice(0, 10);
    if (buckets[key]) {
      buckets[key].total++;
      if (c.status === "RESOLVED" || c.status === "CLOSED") buckets[key].resolved++;
      if (c.status === "ESCALATED") buckets[key].escalated++;
    }
  }

  return {
    days,
    since: since.toISOString(),
    data:  Object.values(buckets),
  };
};

export const getOfficerLeaderboard = async (user) => {
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const tenantFilter = forTenant(user);
  const baseWhere    = { isDeleted: false, ...tenantFilter, assignedToId: { not: null } };

  const [statusGroups, resolvedComplaints, activeComplaints] = await Promise.all([
    prisma.complaint.groupBy({
      by:    ["assignedToId", "status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.complaint.findMany({
      where: { ...baseWhere, status: { in: ["RESOLVED", "CLOSED"] }, resolvedAt: { not: null } },
      select: { assignedToId: true, createdAt: true, resolvedAt: true },
    }),
    prisma.complaint.findMany({
      where: {
        ...baseWhere,
        status: { notIn: NON_SLA_STATUSES },
      },
      select: {
        assignedToId: true,
        createdAt:    true,
        department:   { select: { slaHours: true } },
      },
    }),
  ]);

  const officerIds = [...new Set(statusGroups.map((g) => g.assignedToId).filter(Boolean))];
  const officers   = await prisma.user.findMany({
    where:  { id: { in: officerIds } },
    select: { id: true, name: true, email: true },
  });
  const officerMap = Object.fromEntries(officers.map((o) => [o.id, o]));

  const byOfficerStatus   = {};
  const byOfficerResolved = {};
  const byOfficerActive   = {};

  for (const row of statusGroups) {
    const oid = row.assignedToId;
    if (!byOfficerStatus[oid]) byOfficerStatus[oid] = {};
    byOfficerStatus[oid][row.status] = row._count._all;
  }
  for (const c of resolvedComplaints) {
    if (!byOfficerResolved[c.assignedToId]) byOfficerResolved[c.assignedToId] = [];
    byOfficerResolved[c.assignedToId].push(c);
  }
  for (const c of activeComplaints) {
    if (!byOfficerActive[c.assignedToId]) byOfficerActive[c.assignedToId] = [];
    byOfficerActive[c.assignedToId].push(c);
  }

  const leaderboard = officerIds.map((oid) => {
    const statusMap = byOfficerStatus[oid] ?? {};
    const resolved  = byOfficerResolved[oid] ?? [];
    const active    = byOfficerActive[oid] ?? [];

    const totalAssigned = Object.values(statusMap).reduce((s, n) => s + n, 0);
    const resolvedCount = (statusMap.RESOLVED ?? 0) + (statusMap.CLOSED ?? 0);
    const slaBreached   = active.filter((c) =>
      isSlaBreached(c.createdAt, c.department?.slaHours ?? 48)
    ).length;

    return {
      officer:           officerMap[oid] ?? { id: oid },
      totalAssigned,
      resolvedCount,
      openCount:         (statusMap.IN_PROGRESS ?? 0) + (statusMap.ASSIGNED ?? 0),
      escalatedCount:    statusMap.ESCALATED ?? 0,
      slaBreachedActive: slaBreached,
      avgResolutionTime: msToHuman(avgResolutionMs(resolved)),
    };
  });

  leaderboard.sort((a, b) => b.resolvedCount - a.resolvedCount);

  return leaderboard;
};
