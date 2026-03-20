import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { forTenant } from "../utils/tenantScope.js";
import { isSlaBreached, NON_SLA_STATUSES } from "../utils/slaEngine.js";
import { buildCategorySlaLookupForComplaints, resolveEffectiveSlaHours } from "./workflow.service.js";

// Max rows pulled per analytics sub-query to protect the DB under high complaint volume.
// Real-time aggregation at this scale is intentional; a background cache/materialized view
// should be introduced if complaint counts exceed this threshold per tenant.
const ANALYTICS_ROW_CAP = 5_000;

const getABACFilter = async (user) => {
  const { userId, role } = user;

  if (role === "CALL_OPERATOR") return { createdById: userId };
  if (role === "OFFICER") return { assignedToId: userId };

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
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const getOverview = async (user, query = {}) => {
  const [abacFilter, tenantFilter] = await Promise.all([
    getABACFilter(user),
    Promise.resolve(forTenant(user)),
  ]);

  const baseWhere = { isDeleted: false, ...tenantFilter, ...abacFilter };

  const [statusGroups, priorityGroups] = await Promise.all([
    prisma.complaint.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.complaint.groupBy({
      by: ["priority"],
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
      // Escalated complaints are still unresolved and should remain visible in
      // SLA breached KPI; only terminal states are excluded here.
      status: { notIn: ["RESOLVED", "CLOSED"] },
    },
    select: {
      id: true,
      tenantId: true,
      category: true,
      createdAt: true,
      department: { select: { slaHours: true } },
    },
    orderBy: { createdAt: "desc" },
    take: ANALYTICS_ROW_CAP,
  });

  const overviewPolicyLookup = await buildCategorySlaLookupForComplaints(activeComplaints);

  const slaBreachedCount = activeComplaints.filter((c) => {
    const slaHours = resolveEffectiveSlaHours(c, overviewPolicyLookup);
    return isSlaBreached(c.createdAt, slaHours);
  }).length;

  const activeCount = activeComplaints.length;
  const slaBreachPct = activeCount > 0
    ? +((slaBreachedCount / activeCount) * 100).toFixed(1)
    : 0;

  const resolvedComplaints = await prisma.complaint.findMany({
    where: {
      ...baseWhere,
      status: { in: ["RESOLVED", "CLOSED"] },
      resolvedAt: { not: null },
    },
    select: { createdAt: true, resolvedAt: true },
    orderBy: { resolvedAt: "desc" },
    take: ANALYTICS_ROW_CAP,
  });

  const avgResMs = avgResolutionMs(resolvedComplaints);

  return {
    total,
    byStatus: {
      OPEN: byStatus.OPEN ?? 0,
      ASSIGNED: byStatus.ASSIGNED ?? 0,
      IN_PROGRESS: byStatus.IN_PROGRESS ?? 0,
      ESCALATED: byStatus.ESCALATED ?? 0,
      RESOLVED: byStatus.RESOLVED ?? 0,
      CLOSED: byStatus.CLOSED ?? 0,
    },
    byPriority: {
      LOW: byPriority.LOW ?? 0,
      MEDIUM: byPriority.MEDIUM ?? 0,
      HIGH: byPriority.HIGH ?? 0,
      CRITICAL: byPriority.CRITICAL ?? 0,
    },
    sla: {
      activeComplaints: activeCount,
      breachedCount: slaBreachedCount,
      breachPercentage: slaBreachPct,
    },
    avgResolutionTime: msToHuman(avgResMs),
    resolvedCount: resolvedComplaints.length,
  };
};

export const getDepartmentStats = async (user) => {
  if (!["ADMIN", "SUPER_ADMIN", "DEPARTMENT_HEAD"].includes(user.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const tenantFilter = forTenant(user);
  const baseWhere = { isDeleted: false, ...tenantFilter };

  let deptIdFilter = {};
  if (user.role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { departmentId: true },
    });
    if (!dbUser?.departmentId) {
      throw new ApiError(403, "Department head is not assigned to any department");
    }
    deptIdFilter = { id: dbUser.departmentId };
  }

  const departments = await prisma.department.findMany({
    where: { isDeleted: false, ...tenantFilter, ...deptIdFilter },
    select: { id: true, name: true, slug: true, slaHours: true },
  });

  if (departments.length === 0) return [];

  const deptIds = departments.map((d) => d.id);
  const deptComplaintFilter = { departmentId: { in: deptIds } };

  const [grouped, activeComplaints, resolvedComplaints] = await Promise.all([
    prisma.complaint.groupBy({
      by: ["departmentId", "status"],
      where: { ...baseWhere, ...deptComplaintFilter },
      _count: { _all: true },
    }),
    prisma.complaint.findMany({
      where: {
        ...baseWhere,
        ...deptComplaintFilter,
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
      select: {
        departmentId: true,
        tenantId: true,
        category: true,
        createdAt: true,
        department: { select: { slaHours: true } },
      },
      orderBy: { createdAt: "desc" },
      take: ANALYTICS_ROW_CAP,
    }),
    prisma.complaint.findMany({
      where: {
        ...baseWhere,
        ...deptComplaintFilter,
        status: { in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { not: null },
      },
      select: { departmentId: true, createdAt: true, resolvedAt: true },
      orderBy: { resolvedAt: "desc" },
      take: ANALYTICS_ROW_CAP,
    }),
  ]);

  const byDeptStatus = {};
  const byDeptActive = {};
  const byDeptResolved = {};

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

  const deptPolicyLookup = await buildCategorySlaLookupForComplaints(activeComplaints);

  return departments.map((dept) => {
    const statusMap = byDeptStatus[dept.id] ?? {};
    const active = byDeptActive[dept.id] ?? [];
    const resolved = byDeptResolved[dept.id] ?? [];

    const total = Object.values(statusMap).reduce((s, n) => s + n, 0);
    const slaBreached = active.filter((c) => {
      const slaHours = resolveEffectiveSlaHours(c, deptPolicyLookup);
      return isSlaBreached(c.createdAt, slaHours);
    }).length;

    return {
      department: { id: dept.id, name: dept.name, slug: dept.slug, slaHours: dept.slaHours },
      total,
      byStatus: {
        OPEN: statusMap.OPEN ?? 0,
        ASSIGNED: statusMap.ASSIGNED ?? 0,
        IN_PROGRESS: statusMap.IN_PROGRESS ?? 0,
        ESCALATED: statusMap.ESCALATED ?? 0,
        RESOLVED: statusMap.RESOLVED ?? 0,
        CLOSED: statusMap.CLOSED ?? 0,
      },
      sla: {
        activeCount: active.length,
        breachedCount: slaBreached,
        breachPct: active.length > 0
          ? +((slaBreached / active.length) * 100).toFixed(1)
          : 0,
      },
      avgResolutionTime: msToHuman(avgResolutionMs(resolved)),
    };
  });
};

const getISOWeekKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
};

const INDIA_TIME_ZONE = "Asia/Kolkata";

const getDayKeyInTimeZone = (date, timeZone = INDIA_TIME_ZONE) => {
  // en-CA yields stable YYYY-MM-DD formatting across runtimes.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
};

export const getTrends = async (user, query = {}) => {
  const granularity = query.granularity === "weekly" ? "weekly" : "daily";
  const maxDays = granularity === "weekly" ? 364 : 90;
  const defaultDays = granularity === "weekly" ? 84 : 30;
  const days = Math.min(Math.max(parseInt(query.days) || defaultDays, 7), maxDays);

  const [abacFilter, tenantFilter] = await Promise.all([
    getABACFilter(user),
    Promise.resolve(forTenant(user)),
  ]);

  // Anchor to 00:00:00 UTC of today so that today always has its own bucket.
  // Using (days - 1) means the window is [today - (days-1) days .. today], giving
  // exactly `days` buckets with the last bucket being today.
  const todayKey = new Date().toISOString().slice(0, 10);               // "YYYY-MM-DD"
  const since = new Date(todayKey);                                   // 00:00:00 UTC today
  since.setUTCDate(since.getUTCDate() - (days - 1));                    // go back (days-1) days
  const base = { isDeleted: false, ...tenantFilter, ...abacFilter };

  // Two independent queries: complaints *filed* per day (by createdAt)
  // and complaints *resolved* per day (by resolvedAt OR updatedAt as fallback).
  // This ensures that resolving an older complaint increments today's resolved count,
  // and complaints resolved before `resolvedAt` was tracked still appear via updatedAt.
  const [filed, resolvedList] = await Promise.all([
    prisma.complaint.findMany({
      where: { ...base, createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
      take: ANALYTICS_ROW_CAP,
    }),
    prisma.complaint.findMany({
      where: {
        ...base,
        status: { in: ["RESOLVED", "CLOSED"] },
        OR: [
          { resolvedAt: { gte: since } },
          { resolvedAt: null, updatedAt: { gte: since } },
        ],
      },
      select: { resolvedAt: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
      take: ANALYTICS_ROW_CAP,
    }),
  ]);

  if (granularity === "weekly") {
    const buckets = {};
    for (let i = 0; i < days; i++) {
      const key = getISOWeekKey(new Date(since.getTime() + i * 86_400_000));
      if (!buckets[key]) buckets[key] = { week: key, total: 0, resolved: 0 };
    }
    for (const c of filed) {
      const key = getISOWeekKey(c.createdAt);
      if (buckets[key]) buckets[key].total++;
    }
    for (const c of resolvedList) {
      const resolvedDate = c.resolvedAt ?? c.updatedAt;
      const key = getISOWeekKey(resolvedDate);
      if (buckets[key]) buckets[key].resolved++;
    }
    return { granularity, days, since: since.toISOString(), data: Object.values(buckets) };
  }

  const buckets = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { date: key, total: 0, resolved: 0 };
  }
  for (const c of filed) {
    const key = new Date(c.createdAt).toISOString().slice(0, 10);
    if (buckets[key]) buckets[key].total++;
  }
  for (const c of resolvedList) {
    const resolvedDate = c.resolvedAt ?? c.updatedAt;
    const key = new Date(resolvedDate).toISOString().slice(0, 10);
    if (buckets[key]) buckets[key].resolved++;
  }
  return { granularity, days, since: since.toISOString(), data: Object.values(buckets) };
};

export const getOfficerLeaderboard = async (user) => {
  if (!["ADMIN", "SUPER_ADMIN", "DEPARTMENT_HEAD"].includes(user.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const tenantFilter = forTenant(user);
  let deptFilter = {};
  if (user.role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { departmentId: true },
    });
    if (!dbUser?.departmentId) {
      throw new ApiError(403, "Department head is not assigned to any department");
    }
    deptFilter = { departmentId: dbUser.departmentId };
  }

  const baseWhere = { isDeleted: false, ...tenantFilter, assignedToId: { not: null }, ...deptFilter };

  const [statusGroups, resolvedComplaints, activeComplaints] = await Promise.all([
    prisma.complaint.groupBy({
      by: ["assignedToId", "status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.complaint.findMany({
      where: { ...baseWhere, status: { in: ["RESOLVED", "CLOSED"] }, resolvedAt: { not: null } },
      select: {
        assignedToId: true,
        tenantId: true,
        category: true,
        createdAt: true,
        resolvedAt: true,
        department: { select: { slaHours: true } },
      },
      orderBy: { resolvedAt: "desc" },
      take: ANALYTICS_ROW_CAP,
    }),
    prisma.complaint.findMany({
      where: {
        ...baseWhere,
        // Escalated is unresolved and should be considered for active SLA breach.
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
      select: {
        assignedToId: true,
        tenantId: true,
        category: true,
        createdAt: true,
        department: { select: { slaHours: true } },
      },
      orderBy: { createdAt: "desc" },
      take: ANALYTICS_ROW_CAP,
    }),
  ]);

  const officerIds = [...new Set(statusGroups.map((g) => g.assignedToId).filter(Boolean))];
  const officers = await prisma.user.findMany({
    where: { id: { in: officerIds } },
    select: { id: true, name: true, email: true },
  });
  const officerMap = Object.fromEntries(officers.map((o) => [o.id, o]));

  const byOfficerStatus = {};
  const byOfficerResolved = {};
  const byOfficerActive = {};

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

  const activePolicyLookup = await buildCategorySlaLookupForComplaints(activeComplaints);
  const resolvedPolicyLookup = await buildCategorySlaLookupForComplaints(resolvedComplaints);

  const leaderboard = officerIds.map((oid) => {
    const statusMap = byOfficerStatus[oid] ?? {};
    const resolved = byOfficerResolved[oid] ?? [];
    const active = byOfficerActive[oid] ?? [];

    const totalAssigned = Object.values(statusMap).reduce((s, n) => s + n, 0);
    const resolvedCount = (statusMap.RESOLVED ?? 0) + (statusMap.CLOSED ?? 0);
    const slaBreached = active.filter((c) => {
      const slaHours = resolveEffectiveSlaHours(c, activePolicyLookup);
      return isSlaBreached(c.createdAt, slaHours);
    }).length;

    const resolvedWithinSla = resolved.filter((c) => {
      const slaHours = resolveEffectiveSlaHours(c, resolvedPolicyLookup);
      const deadline = new Date(c.createdAt).getTime() + slaHours * 3_600_000;
      return new Date(c.resolvedAt).getTime() <= deadline;
    }).length;

    return {
      officer: officerMap[oid] ?? { id: oid },
      totalAssigned,
      resolvedCount,
      openCount: (statusMap.IN_PROGRESS ?? 0) + (statusMap.ASSIGNED ?? 0),
      escalatedCount: statusMap.ESCALATED ?? 0,
      slaBreachedActive: slaBreached,
      slaComplianceRate: resolved.length > 0
        ? +((resolvedWithinSla / resolved.length) * 100).toFixed(1)
        : null,
      avgResolutionTime: msToHuman(avgResolutionMs(resolved)),
    };
  });

  leaderboard.sort((a, b) => b.resolvedCount - a.resolvedCount);

  return leaderboard.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    performanceTier:
      entry.slaComplianceRate === null ? "UNRATED" :
        entry.slaComplianceRate >= 80 ? "TOP" :
          entry.slaComplianceRate >= 50 ? "AVERAGE" : "NEEDS_IMPROVEMENT",
  }));
};

export const getSlaHeatmap = async (user, query = {}) => {
  if (!["ADMIN", "SUPER_ADMIN", "DEPARTMENT_HEAD"].includes(user.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const granularity = query.granularity === "daily" ? "daily" : "weekly";
  const maxDays = granularity === "daily" ? 90 : 364;
  const defaultDays = granularity === "daily" ? 30 : 84;
  const days = Math.min(Math.max(parseInt(query.days) || defaultDays, 7), maxDays);

  const tenantFilter = forTenant(user);
  let deptIdFilter = {};

  if (user.role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { departmentId: true },
    });
    if (!dbUser?.departmentId) {
      throw new ApiError(403, "Department head is not assigned to any department");
    }
    deptIdFilter = { id: dbUser.departmentId };
  }

  const since = new Date(Date.now() - days * 86_400_000);

  const [departments, complaints] = await Promise.all([
    prisma.department.findMany({
      where: { isDeleted: false, isActive: true, ...tenantFilter, ...deptIdFilter },
      select: { id: true, name: true, slug: true, slaHours: true },
    }),
    prisma.complaint.findMany({
      where: {
        isDeleted: false,
        ...tenantFilter,
        departmentId: { not: null },
        ...(deptIdFilter.id && { departmentId: deptIdFilter.id }),
        createdAt: { gte: since },
        // Include escalated complaints in SLA analytics; only terminal states
        // are considered complete and excluded from active breach checks.
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
      select: {
        departmentId: true,
        tenantId: true,
        category: true,
        createdAt: true,
        resolvedAt: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
      take: ANALYTICS_ROW_CAP,
    }),
  ]);

  if (departments.length === 0) {
    return { granularity, since: since.toISOString(), periods: [], departments: [] };
  }

  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
  const now = Date.now();
  const periods = [];
  const periodSet = new Set();

  if (granularity === "weekly") {
    for (let i = 0; i < days; i++) {
      const key = getISOWeekKey(new Date(since.getTime() + i * 86_400_000));
      if (!periodSet.has(key)) { periods.push(key); periodSet.add(key); }
    }
  } else {
    for (let i = 0; i < days; i++) {
      const key = new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      periods.push(key);
      periodSet.add(key);
    }
  }

  const matrix = {};
  for (const dept of departments) {
    matrix[dept.id] = {};
    for (const p of periods) matrix[dept.id][p] = { total: 0, breached: 0 };
  }

  const heatmapPolicyLookup = await buildCategorySlaLookupForComplaints(complaints);

  for (const c of complaints) {
    if (!c.departmentId || !matrix[c.departmentId]) continue;

    const periodKey = granularity === "weekly"
      ? getISOWeekKey(c.createdAt)
      : new Date(c.createdAt).toISOString().slice(0, 10);

    if (!periodSet.has(periodKey)) continue;

    const cell = matrix[c.departmentId][periodKey];
    const slaHours = resolveEffectiveSlaHours(
      { tenantId: c.tenantId, category: c.category, department: { slaHours: deptMap[c.departmentId]?.slaHours ?? 48 } },
      heatmapPolicyLookup,
    );
    const deadline = new Date(c.createdAt).getTime() + slaHours * 3_600_000;

    cell.total++;

    const breached =
      (c.status === "RESOLVED" || c.status === "CLOSED")
        ? Boolean(c.resolvedAt) && new Date(c.resolvedAt).getTime() > deadline
        : now > deadline;

    if (breached) cell.breached++;
  }

  return {
    granularity,
    since: since.toISOString(),
    periods,
    departments: departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      slug: dept.slug,
      slaHours: dept.slaHours,
      heatmap: periods.map((p) => {
        const cell = matrix[dept.id][p];
        return {
          period: p,
          total: cell.total,
          breached: cell.breached,
          breachPct: cell.total > 0
            ? +((cell.breached / cell.total) * 100).toFixed(1)
            : null,
        };
      }),
    })),
  };
};

export const getEscalationTrend = async (user, query = {}) => {
  const granularity = query.granularity === "weekly" ? "weekly" : "daily";
  const maxDays = granularity === "weekly" ? 364 : 90;
  const defaultDays = granularity === "weekly" ? 84 : 30;
  const days = Math.min(Math.max(parseInt(query.days) || defaultDays, 7), maxDays);

  const [abacFilter, tenantFilter] = await Promise.all([
    getABACFilter(user),
    Promise.resolve(forTenant(user)),
  ]);

  const since = new Date(Date.now() - days * 86_400_000);

  const [escalationEvents, allComplaints] = await Promise.all([
    prisma.complaintStatusHistory.findMany({
      where: {
        newStatus: "ESCALATED",
        changedAt: { gte: since },
        complaint: { isDeleted: false, ...tenantFilter, ...abacFilter },
      },
      orderBy: { changedAt: "asc" },
      select: {
        changedAt: true,
        complaint: {
          select: {
            departmentId: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      take: ANALYTICS_ROW_CAP,
    }),
    prisma.complaint.findMany({
      where: {
        isDeleted: false,
        ...tenantFilter,
        ...abacFilter,
        createdAt: { gte: since },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
      take: ANALYTICS_ROW_CAP,
    }),
  ]);

  const periods = [];
  const periodSet = new Set();

  if (granularity === "weekly") {
    for (let i = 0; i < days; i++) {
      const key = getISOWeekKey(new Date(since.getTime() + i * 86_400_000));
      if (!periodSet.has(key)) { periods.push(key); periodSet.add(key); }
    }
  } else {
    for (let i = 0; i < days; i++) {
      const key = getDayKeyInTimeZone(new Date(since.getTime() + i * 86_400_000));
      periods.push(key);
      periodSet.add(key);
    }
  }

  const totalBucket = Object.fromEntries(periods.map((p) => [p, 0]));
  const escalationBucket = Object.fromEntries(periods.map((p) => [p, 0]));
  const deptEscalations = {};

  for (const c of allComplaints) {
    const key = granularity === "weekly"
      ? getISOWeekKey(c.createdAt)
      : getDayKeyInTimeZone(c.createdAt);
    if (key in totalBucket) totalBucket[key]++;
  }

  for (const e of escalationEvents) {
    const key = granularity === "weekly"
      ? getISOWeekKey(e.changedAt)
      : getDayKeyInTimeZone(e.changedAt);
    if (key in escalationBucket) escalationBucket[key]++;

    const deptId = e.complaint.departmentId;
    if (deptId) {
      if (!deptEscalations[deptId]) {
        deptEscalations[deptId] = {
          id: deptId,
          name: e.complaint.department?.name ?? "Unknown",
          count: 0,
        };
      }
      deptEscalations[deptId].count++;
    }
  }

  const topDepartments = Object.values(deptEscalations)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const data = periods.map((p) => ({
    [granularity === "weekly" ? "week" : "date"]: p,
    escalations: escalationBucket[p],
    total: totalBucket[p],
    escalationRate: totalBucket[p] > 0
      ? +((escalationBucket[p] / totalBucket[p]) * 100).toFixed(1)
      : 0,
  }));

  const totalEscalations = escalationEvents.length;
  const totalCreated = allComplaints.length;

  return {
    granularity,
    days,
    since: since.toISOString(),
    summary: {
      totalEscalations,
      totalComplaints: totalCreated,
      overallEscalationRate: totalCreated > 0
        ? +((totalEscalations / totalCreated) * 100).toFixed(1)
        : 0,
    },
    topEscalatingDepartments: topDepartments,
    data,
  };
};

export const getCategoryDistribution = async (user) => {
  const [abacFilter, tenantFilter] = await Promise.all([
    getABACFilter(user),
    Promise.resolve(forTenant(user)),
  ]);

  const baseWhere = { isDeleted: false, ...tenantFilter, ...abacFilter };

  const [byStatus, byPriority, bySentiment] = await Promise.all([
    prisma.complaint.groupBy({
      by: ["category", "status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.complaint.groupBy({
      by: ["category", "priority"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.complaint.groupBy({
      by: ["category"],
      where: { ...baseWhere, sentimentScore: { not: null } },
      _avg: { sentimentScore: true },
      _count: { _all: true },
    }),
  ]);

  const total = byStatus.reduce((s, r) => s + r._count._all, 0);
  const uncategorizedCount = byStatus
    .filter((r) => r.category === null)
    .reduce((s, r) => s + r._count._all, 0);

  const categoryMap = {};

  for (const r of byStatus) {
    const key = r.category ?? "__null__";
    if (!categoryMap[key]) {
      categoryMap[key] = { category: r.category, total: 0, byStatus: {}, byPriority: {} };
    }
    categoryMap[key].total += r._count._all;
    categoryMap[key].byStatus[r.status] = r._count._all;
  }

  for (const r of byPriority) {
    const key = r.category ?? "__null__";
    if (categoryMap[key]) categoryMap[key].byPriority[r.priority] = r._count._all;
  }

  const sentimentMap = Object.fromEntries(
    bySentiment.map((r) => [r.category ?? "__null__", r._avg.sentimentScore])
  );

  const STATUS_LIST = ["OPEN", "ASSIGNED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"];
  const PRIORITY_LIST = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  const buildEntry = (cat) => ({
    category: cat.category,
    total: cat.total,
    percentage: total > 0 ? +((cat.total / total) * 100).toFixed(1) : 0,
    byStatus: Object.fromEntries(STATUS_LIST.map((s) => [s, cat.byStatus[s] ?? 0])),
    byPriority: Object.fromEntries(PRIORITY_LIST.map((p) => [p, cat.byPriority[p] ?? 0])),
    avgSentimentScore: sentimentMap[cat.category ?? "__null__"] != null
      ? parseFloat(sentimentMap[cat.category ?? "__null__"].toFixed(4))
      : null,
  });

  const allEntries = Object.values(categoryMap)
    .map(buildEntry)
    .sort((a, b) => b.total - a.total);

  const categorized = allEntries.filter((c) => c.category !== null);
  const uncategorized = allEntries.find((c) => c.category === null) ?? null;

  return {
    total,
    uncategorized: uncategorizedCount,
    categories: categorized,
    uncategorizedBreakdown: uncategorized,
  };
};

// ── Map Stats ─────────────────────────────────────────────────────────────────
// Keyword → State-ID mapping (city names, district names, state names, aliases).
// Each entry is a lowercase keyword that appears in the `locality` field and maps
// to a two-letter state ID used by the frontend IndiaMapView component.
const LOCALITY_KEYWORD_MAP = [
  // Jammu & Kashmir
  { keywords: ["srinagar", "jammu", "kashmir", "anantnag", "baramulla", "sopore", "pulwama", "kupwara", "udhampur", "kathua", "rajouri"], id: "JK" },
  // Ladakh
  { keywords: ["leh", "ladakh", "kargil"], id: "LA" },
  // Himachal Pradesh
  { keywords: ["shimla", "dharamsala", "manali", "solan", "kangra", "mandi", "kullu", "hamirpur", "una", "bilaspur", "chamba", "kinnaur", "himachal"], id: "HP" },
  // Punjab
  { keywords: ["chandigarh", "amritsar", "ludhiana", "jalandhar", "patiala", "bathinda", "mohali", "gurdaspur", "firozpur", "fatehgarh", "hoshiarpur", "nawanshahr", "moga", "barnala", "sangrur", "faridkot", "muktsar", "kapurthala", "ropar", "pathankot", "punjab"], id: "PB" },
  // Haryana
  { keywords: ["gurugram", "gurgaon", "faridabad", "rohtak", "ambala", "hisar", "panipat", "karnal", "sonipat", "rewari", "bhiwani", "sirsa", "jhajjar", "palwal", "nuh", "mewat", "kaithal", "jind", "yamunanagar", "panchkula", "haryana"], id: "HR" },
  // Uttarakhand
  { keywords: ["dehradun", "haridwar", "nainital", "mussoorie", "rishikesh", "roorkee", "kashipur", "rudrapur", "haldwani", "almora", "pithoragarh", "tehri", "chamoli", "uttarakhand", "uttarkashi", "bageshwar"], id: "UK" },
  // Delhi
  { keywords: ["delhi", "new delhi", "dwarka", "rohini", "lajpat", "connaught", "janakpuri", "shahdara", "east delhi", "south delhi", "north delhi", "west delhi", "central delhi", "noida extension"], id: "DL" },
  // Rajasthan
  { keywords: ["jaipur", "jodhpur", "udaipur", "kota", "ajmer", "bikaner", "alwar", "bharatpur", "pushkar", "sikar", "pali", "barmer", "jaisalmer", "chittorgarh", "bhilwara", "tonk", "nagaur", "rajasthan"], id: "RJ" },
  // Uttar Pradesh
  { keywords: ["lucknow", "noida", "varanasi", "agra", "kanpur", "prayagraj", "allahabad", "ghaziabad", "meerut", "mathura", "vrindavan", "gorakhpur", "aligarh", "bareilly", "moradabad", "saharanpur", "jhansi", "firozabad", "muzaffarnagar", "hapur", "shahjahanpur", "rampur", "etawah", "faizabad", "ayodhya", "sitapur", "lakhimpur", "uttar pradesh"], id: "UP" },
  // Bihar
  { keywords: ["patna", "gaya", "muzaffarpur", "bhagalpur", "darbhanga", "purnea", "araria", "begusarai", "motihari", "samastipur", "siwan", "buxar", "sasaram", "bihar sharif", "nalanda", "katihar", "bihar"], id: "BR" },
  // Sikkim
  { keywords: ["gangtok", "namchi", "mangan", "gyalshing", "sikkim"], id: "SK" },
  // Arunachal Pradesh
  { keywords: ["itanagar", "naharlagun", "pasighat", "tawang", "ziro", "arunachal"], id: "AR" },
  // Nagaland
  { keywords: ["kohima", "dimapur", "mokokchung", "wokha", "tuensang", "nagaland"], id: "NL" },
  // Manipur
  { keywords: ["imphal", "churachandpur", "thoubal", "bishnupur", "senapati", "manipur"], id: "MN" },
  // Mizoram
  { keywords: ["aizawl", "lunglei", "champhai", "serchhip", "mizoram"], id: "MZ" },
  // Tripura
  { keywords: ["agartala", "udaipur", "dharmanagar", "kailashahar", "belonia", "tripura"], id: "TR" },
  // Meghalaya
  { keywords: ["shillong", "tura", "jowai", "baghmara", "nongstoin", "meghalaya"], id: "ML" },
  // Assam
  { keywords: ["guwahati", "dibrugarh", "silchar", "jorhat", "nagaon", "tezpur", "tinsukia", "lakhimpur", "barpeta", "dhubri", "goalpara", "kamrup", "assam"], id: "AS" },
  // West Bengal
  { keywords: ["kolkata", "calcutta", "siliguri", "durgapur", "asansol", "howrah", "hooghly", "burdwan", "barddhaman", "malda", "murshidabad", "nadia", "north 24 parganas", "south 24 parganas", "midnapore", "midnapur", "west bengal"], id: "WB" },
  // Jharkhand
  { keywords: ["ranchi", "jamshedpur", "dhanbad", "bokaro", "deoghar", "hazaribagh", "giridih", "phusro", "ramgarh", "jharkhand"], id: "JH" },
  // Odisha
  { keywords: ["bhubaneswar", "cuttack", "rourkela", "sambalpur", "berhampur", "brahmapur", "puri", "balasore", "baleswar", "keonjhar", "koraput", "odisha", "orissa"], id: "OD" },
  // Chhattisgarh
  { keywords: ["raipur", "bilaspur", "durg", "korba", "rajnandgaon", "jagdalpur", "ambikapur", "chhattisgarh"], id: "CT" },
  // Madhya Pradesh
  { keywords: ["bhopal", "indore", "jabalpur", "gwalior", "ujjain", "sagar", "satna", "rewa", "murwara", "singrauli", "dewas", "madhya pradesh"], id: "MP" },
  // Gujarat
  { keywords: ["ahmedabad", "surat", "vadodara", "baroda", "rajkot", "bhavnagar", "jamnagar", "gandhinagar", "anand", "bharuch", "mehsana", "nadiad", "junagadh", "navsari", "morbi", "surendranagar", "gujarat"], id: "GJ" },
  // Maharashtra
  { keywords: ["mumbai", "pune", "nagpur", "nashik", "aurangabad", "solapur", "thane", "kolhapur", "nanded", "amravati", "jalgaon", "akola", "latur", "dhule", "ahmednagar", "chandrapur", "raigad", "ratnagiri", "satara", "sangli", "wardha", "yavatmal", "buldhana", "washim", "gondia", "bhandara", "gadchiroli", "nandurbar", "palghar", "maharashtra"], id: "MH" },
  // Goa
  { keywords: ["panaji", "margao", "vasco", "ponda", "mapusa", "goa"], id: "GA" },
  // Karnataka
  { keywords: ["bengaluru", "bangalore", "mysuru", "mysore", "hubli", "dharwad", "mangaluru", "mangalore", "belagavi", "belgaum", "kalaburagi", "gulbarga", "davanagere", "bellary", "ballari", "bijapur", "vijayapura", "tumakuru", "tumkur", "udupi", "hassan", "shimoga", "shivamogga", "raichur", "koppal", "gadag", "haveri", "chikkamagaluru", "kodagu", "mandya", "chamarajanagar", "karnataka"], id: "KA" },
  // Kerala
  { keywords: ["thiruvananthapuram", "trivandrum", "kochi", "cochin", "kozhikode", "calicut", "thrissur", "kollam", "palakkad", "alappuzha", "kannur", "malappuram", "kottayam", "idukki", "wayanad", "ernakulam", "kasaragod", "pathanamthitta", "kerala"], id: "KL" },
  // Tamil Nadu
  { keywords: ["chennai", "madras", "coimbatore", "madurai", "tiruchirappalli", "trichy", "salem", "tirunelveli", "tirupur", "vellore", "erode", "dindigul", "kanchipuram", "thanjavur", "tanjore", "pudukottai", "nagapattinam", "cuddalore", "dharmapuri", "krishnagiri", "namakkal", "ramanathapuram", "sivaganga", "theni", "virudhunagar", "karur", "nilgiris", "ariyalur", "perambalur", "tindivanam", "villupuram", "kallakurichi", "tenkasi", "ranipet", "tirupathur", "tamil nadu", "tamilnadu"], id: "TN" },
  // Andhra Pradesh
  { keywords: ["visakhapatnam", "vizag", "vijayawada", "tirupati", "guntur", "nellore", "kurnool", "rajahmundry", "kakinada", "kadapa", "cuddapah", "srikakulam", "west godavari", "east godavari", "krishna", "prakasam", "anakapalle", "eluru", "machilipatnam", "ongole", "chittoor", "andhra", "andhra pradesh"], id: "AP" },
  // Telangana
  { keywords: ["hyderabad", "warangal", "nizamabad", "karimnagar", "khammam", "adilabad", "nalgonda", "mahaboobnagar", "mahbubnagar", "rangareddy", "medak", "mancherial", "ramagundam", "telangana"], id: "TS" },
  // Lakshadweep
  { keywords: ["kavaratti", "agatti", "lakshadweep", "lakshadeep"], id: "LD" },
  // Andaman & Nicobar
  { keywords: ["port blair", "andaman", "nicobar", "little andaman", "car nicobar"], id: "AN" },
  // Puducherry
  { keywords: ["puducherry", "pondicherry", "karaikal", "mahe", "yanam"], id: "PY" },
  // Chandigarh (UT)
  { keywords: ["chandigarh ut", "chandigarh union"], id: "CH" },
  // Dadra & Nagar Haveli / Daman & Diu
  { keywords: ["silvassa", "dadra", "nagar haveli", "daman", "diu"], id: "DN" },
];

/**
 * City keyword map: each entry maps one or more locality keywords to a
 * canonical city name and its parent state ID.
 * Order matters — longer/more specific keywords should come first where
 * ambiguity is possible (e.g. "new delhi" before "delhi").
 */
const CITY_KEYWORD_MAP = [
  // J&K
  { keywords: ["srinagar"], city: "Srinagar", stateId: "JK" },
  { keywords: ["jammu"], city: "Jammu", stateId: "JK" },
  // Ladakh
  { keywords: ["leh"], city: "Leh", stateId: "LA" },
  { keywords: ["kargil"], city: "Kargil", stateId: "LA" },
  // Himachal Pradesh
  { keywords: ["shimla"], city: "Shimla", stateId: "HP" },
  { keywords: ["dharamsala", "dharamshala"], city: "Dharamsala", stateId: "HP" },
  { keywords: ["manali"], city: "Manali", stateId: "HP" },
  // Punjab
  { keywords: ["amritsar"], city: "Amritsar", stateId: "PB" },
  { keywords: ["ludhiana"], city: "Ludhiana", stateId: "PB" },
  { keywords: ["jalandhar"], city: "Jalandhar", stateId: "PB" },
  { keywords: ["patiala"], city: "Patiala", stateId: "PB" },
  { keywords: ["bathinda"], city: "Bathinda", stateId: "PB" },
  { keywords: ["mohali"], city: "Mohali", stateId: "PB" },
  { keywords: ["pathankot"], city: "Pathankot", stateId: "PB" },
  // Haryana
  { keywords: ["gurugram", "gurgaon"], city: "Gurugram", stateId: "HR" },
  { keywords: ["faridabad"], city: "Faridabad", stateId: "HR" },
  { keywords: ["rohtak"], city: "Rohtak", stateId: "HR" },
  { keywords: ["ambala"], city: "Ambala", stateId: "HR" },
  { keywords: ["hisar"], city: "Hisar", stateId: "HR" },
  { keywords: ["panipat"], city: "Panipat", stateId: "HR" },
  { keywords: ["karnal"], city: "Karnal", stateId: "HR" },
  { keywords: ["sonipat"], city: "Sonipat", stateId: "HR" },
  { keywords: ["panchkula"], city: "Panchkula", stateId: "HR" },
  // Chandigarh (UT — must check before Punjab which also mentions chandigarh)
  { keywords: ["chandigarh"], city: "Chandigarh", stateId: "PB" }, // PB covers Chandigarh in state map
  // Uttarakhand
  { keywords: ["dehradun"], city: "Dehradun", stateId: "UK" },
  { keywords: ["haridwar"], city: "Haridwar", stateId: "UK" },
  { keywords: ["nainital"], city: "Nainital", stateId: "UK" },
  { keywords: ["rishikesh"], city: "Rishikesh", stateId: "UK" },
  { keywords: ["roorkee"], city: "Roorkee", stateId: "UK" },
  { keywords: ["haldwani"], city: "Haldwani", stateId: "UK" },
  // Delhi
  { keywords: ["new delhi"], city: "New Delhi", stateId: "DL" },
  { keywords: ["dwarka"], city: "Dwarka", stateId: "DL" },
  { keywords: ["rohini"], city: "Rohini", stateId: "DL" },
  { keywords: ["janakpuri"], city: "Janakpuri", stateId: "DL" },
  { keywords: ["shahdara"], city: "Shahdara", stateId: "DL" },
  { keywords: ["lajpat"], city: "Lajpat Nagar", stateId: "DL" },
  { keywords: ["delhi"], city: "New Delhi", stateId: "DL" },
  // Rajasthan
  { keywords: ["jaipur"], city: "Jaipur", stateId: "RJ" },
  { keywords: ["jodhpur"], city: "Jodhpur", stateId: "RJ" },
  { keywords: ["udaipur"], city: "Udaipur", stateId: "RJ" },
  { keywords: ["kota"], city: "Kota", stateId: "RJ" },
  { keywords: ["ajmer"], city: "Ajmer", stateId: "RJ" },
  { keywords: ["bikaner"], city: "Bikaner", stateId: "RJ" },
  { keywords: ["alwar"], city: "Alwar", stateId: "RJ" },
  { keywords: ["jaisalmer"], city: "Jaisalmer", stateId: "RJ" },
  // Uttar Pradesh
  { keywords: ["lucknow"], city: "Lucknow", stateId: "UP" },
  { keywords: ["noida extension", "noida"], city: "Noida", stateId: "UP" },
  { keywords: ["varanasi", "banaras", "kashi"], city: "Varanasi", stateId: "UP" },
  { keywords: ["agra"], city: "Agra", stateId: "UP" },
  { keywords: ["kanpur"], city: "Kanpur", stateId: "UP" },
  { keywords: ["prayagraj", "allahabad"], city: "Prayagraj", stateId: "UP" },
  { keywords: ["ghaziabad"], city: "Ghaziabad", stateId: "UP" },
  { keywords: ["meerut"], city: "Meerut", stateId: "UP" },
  { keywords: ["mathura", "vrindavan"], city: "Mathura", stateId: "UP" },
  { keywords: ["gorakhpur"], city: "Gorakhpur", stateId: "UP" },
  { keywords: ["aligarh"], city: "Aligarh", stateId: "UP" },
  { keywords: ["bareilly"], city: "Bareilly", stateId: "UP" },
  { keywords: ["moradabad"], city: "Moradabad", stateId: "UP" },
  { keywords: ["ayodhya", "faizabad"], city: "Ayodhya", stateId: "UP" },
  // Bihar
  { keywords: ["patna"], city: "Patna", stateId: "BR" },
  { keywords: ["gaya"], city: "Gaya", stateId: "BR" },
  { keywords: ["muzaffarpur"], city: "Muzaffarpur", stateId: "BR" },
  { keywords: ["bhagalpur"], city: "Bhagalpur", stateId: "BR" },
  { keywords: ["darbhanga"], city: "Darbhanga", stateId: "BR" },
  // Sikkim
  { keywords: ["gangtok"], city: "Gangtok", stateId: "SK" },
  // Arunachal Pradesh
  { keywords: ["itanagar", "naharlagun"], city: "Itanagar", stateId: "AR" },
  { keywords: ["tawang"], city: "Tawang", stateId: "AR" },
  // Nagaland
  { keywords: ["kohima"], city: "Kohima", stateId: "NL" },
  { keywords: ["dimapur"], city: "Dimapur", stateId: "NL" },
  // Manipur
  { keywords: ["imphal"], city: "Imphal", stateId: "MN" },
  // Mizoram
  { keywords: ["aizawl"], city: "Aizawl", stateId: "MZ" },
  // Tripura
  { keywords: ["agartala"], city: "Agartala", stateId: "TR" },
  // Meghalaya
  { keywords: ["shillong"], city: "Shillong", stateId: "ML" },
  { keywords: ["tura"], city: "Tura", stateId: "ML" },
  // Assam
  { keywords: ["guwahati", "gauhati"], city: "Guwahati", stateId: "AS" },
  { keywords: ["dibrugarh"], city: "Dibrugarh", stateId: "AS" },
  { keywords: ["silchar"], city: "Silchar", stateId: "AS" },
  { keywords: ["jorhat"], city: "Jorhat", stateId: "AS" },
  { keywords: ["tezpur"], city: "Tezpur", stateId: "AS" },
  // West Bengal
  { keywords: ["kolkata", "calcutta"], city: "Kolkata", stateId: "WB" },
  { keywords: ["siliguri"], city: "Siliguri", stateId: "WB" },
  { keywords: ["durgapur"], city: "Durgapur", stateId: "WB" },
  { keywords: ["asansol"], city: "Asansol", stateId: "WB" },
  { keywords: ["howrah"], city: "Howrah", stateId: "WB" },
  // Jharkhand
  { keywords: ["ranchi"], city: "Ranchi", stateId: "JH" },
  { keywords: ["jamshedpur"], city: "Jamshedpur", stateId: "JH" },
  { keywords: ["dhanbad"], city: "Dhanbad", stateId: "JH" },
  { keywords: ["bokaro"], city: "Bokaro", stateId: "JH" },
  // Odisha
  { keywords: ["bhubaneswar"], city: "Bhubaneswar", stateId: "OD" },
  { keywords: ["cuttack"], city: "Cuttack", stateId: "OD" },
  { keywords: ["rourkela"], city: "Rourkela", stateId: "OD" },
  { keywords: ["sambalpur"], city: "Sambalpur", stateId: "OD" },
  { keywords: ["berhampur", "brahmapur"], city: "Berhampur", stateId: "OD" },
  { keywords: ["puri"], city: "Puri", stateId: "OD" },
  // Chhattisgarh
  { keywords: ["raipur"], city: "Raipur", stateId: "CT" },
  { keywords: ["bilaspur"], city: "Bilaspur", stateId: "CT" },
  { keywords: ["durg"], city: "Durg", stateId: "CT" },
  { keywords: ["korba"], city: "Korba", stateId: "CT" },
  { keywords: ["jagdalpur"], city: "Jagdalpur", stateId: "CT" },
  // Madhya Pradesh
  { keywords: ["bhopal"], city: "Bhopal", stateId: "MP" },
  { keywords: ["indore"], city: "Indore", stateId: "MP" },
  { keywords: ["jabalpur"], city: "Jabalpur", stateId: "MP" },
  { keywords: ["gwalior"], city: "Gwalior", stateId: "MP" },
  { keywords: ["ujjain"], city: "Ujjain", stateId: "MP" },
  { keywords: ["sagar"], city: "Sagar", stateId: "MP" },
  // Gujarat
  { keywords: ["ahmedabad"], city: "Ahmedabad", stateId: "GJ" },
  { keywords: ["surat"], city: "Surat", stateId: "GJ" },
  { keywords: ["vadodara", "baroda"], city: "Vadodara", stateId: "GJ" },
  { keywords: ["rajkot"], city: "Rajkot", stateId: "GJ" },
  { keywords: ["bhavnagar"], city: "Bhavnagar", stateId: "GJ" },
  { keywords: ["jamnagar"], city: "Jamnagar", stateId: "GJ" },
  { keywords: ["gandhinagar"], city: "Gandhinagar", stateId: "GJ" },
  { keywords: ["junagadh"], city: "Junagadh", stateId: "GJ" },
  // Maharashtra
  { keywords: ["mumbai", "bombay"], city: "Mumbai", stateId: "MH" },
  { keywords: ["pune", "poona"], city: "Pune", stateId: "MH" },
  { keywords: ["nagpur"], city: "Nagpur", stateId: "MH" },
  { keywords: ["nashik"], city: "Nashik", stateId: "MH" },
  { keywords: ["aurangabad"], city: "Aurangabad", stateId: "MH" },
  { keywords: ["solapur"], city: "Solapur", stateId: "MH" },
  { keywords: ["thane"], city: "Thane", stateId: "MH" },
  { keywords: ["kolhapur"], city: "Kolhapur", stateId: "MH" },
  { keywords: ["amravati"], city: "Amravati", stateId: "MH" },
  { keywords: ["nanded"], city: "Nanded", stateId: "MH" },
  { keywords: ["palghar"], city: "Palghar", stateId: "MH" },
  // Goa
  { keywords: ["panaji", "panjim"], city: "Panaji", stateId: "GA" },
  { keywords: ["margao", "madgaon"], city: "Margao", stateId: "GA" },
  { keywords: ["vasco"], city: "Vasco da Gama", stateId: "GA" },
  // Karnataka
  { keywords: ["bengaluru", "bangalore"], city: "Bengaluru", stateId: "KA" },
  { keywords: ["mysuru", "mysore"], city: "Mysuru", stateId: "KA" },
  { keywords: ["hubli", "dharwad"], city: "Hubli", stateId: "KA" },
  { keywords: ["mangaluru", "mangalore"], city: "Mangaluru", stateId: "KA" },
  { keywords: ["belagavi", "belgaum"], city: "Belagavi", stateId: "KA" },
  { keywords: ["kalaburagi", "gulbarga"], city: "Kalaburagi", stateId: "KA" },
  { keywords: ["davanagere"], city: "Davanagere", stateId: "KA" },
  { keywords: ["ballari", "bellary"], city: "Ballari", stateId: "KA" },
  { keywords: ["vijayapura", "bijapur"], city: "Vijayapura", stateId: "KA" },
  { keywords: ["udupi"], city: "Udupi", stateId: "KA" },
  { keywords: ["tumakuru", "tumkur"], city: "Tumakuru", stateId: "KA" },
  // Kerala
  { keywords: ["thiruvananthapuram", "trivandrum"], city: "Thiruvananthapuram", stateId: "KL" },
  { keywords: ["kochi", "cochin", "ernakulam"], city: "Kochi", stateId: "KL" },
  { keywords: ["kozhikode", "calicut"], city: "Kozhikode", stateId: "KL" },
  { keywords: ["thrissur", "trichur"], city: "Thrissur", stateId: "KL" },
  { keywords: ["kollam", "quilon"], city: "Kollam", stateId: "KL" },
  { keywords: ["palakkad", "palghat"], city: "Palakkad", stateId: "KL" },
  { keywords: ["alappuzha", "alleppey"], city: "Alappuzha", stateId: "KL" },
  { keywords: ["kannur", "cannanore"], city: "Kannur", stateId: "KL" },
  { keywords: ["malappuram"], city: "Malappuram", stateId: "KL" },
  { keywords: ["kottayam"], city: "Kottayam", stateId: "KL" },
  // Tamil Nadu
  { keywords: ["chennai", "madras"], city: "Chennai", stateId: "TN" },
  { keywords: ["coimbatore"], city: "Coimbatore", stateId: "TN" },
  { keywords: ["madurai"], city: "Madurai", stateId: "TN" },
  { keywords: ["tiruchirappalli", "trichy", "trichinopoly"], city: "Tiruchirappalli", stateId: "TN" },
  { keywords: ["salem"], city: "Salem", stateId: "TN" },
  { keywords: ["tirunelveli"], city: "Tirunelveli", stateId: "TN" },
  { keywords: ["tirupur"], city: "Tirupur", stateId: "TN" },
  { keywords: ["vellore"], city: "Vellore", stateId: "TN" },
  { keywords: ["erode"], city: "Erode", stateId: "TN" },
  { keywords: ["kanchipuram"], city: "Kanchipuram", stateId: "TN" },
  { keywords: ["thanjavur", "tanjore"], city: "Thanjavur", stateId: "TN" },
  // Andhra Pradesh
  { keywords: ["visakhapatnam", "vizag", "vishakhapatnam"], city: "Visakhapatnam", stateId: "AP" },
  { keywords: ["vijayawada", "bezawada"], city: "Vijayawada", stateId: "AP" },
  { keywords: ["tirupati"], city: "Tirupati", stateId: "AP" },
  { keywords: ["guntur"], city: "Guntur", stateId: "AP" },
  { keywords: ["nellore"], city: "Nellore", stateId: "AP" },
  { keywords: ["kurnool"], city: "Kurnool", stateId: "AP" },
  { keywords: ["rajahmundry", "rajahmahendravaram"], city: "Rajahmundry", stateId: "AP" },
  { keywords: ["kakinada"], city: "Kakinada", stateId: "AP" },
  { keywords: ["kadapa", "cuddapah"], city: "Kadapa", stateId: "AP" },
  // Telangana
  { keywords: ["hyderabad", "secunderabad", "cyberabad"], city: "Hyderabad", stateId: "TS" },
  { keywords: ["warangal", "hanamkonda"], city: "Warangal", stateId: "TS" },
  { keywords: ["nizamabad"], city: "Nizamabad", stateId: "TS" },
  { keywords: ["karimnagar"], city: "Karimnagar", stateId: "TS" },
  { keywords: ["khammam"], city: "Khammam", stateId: "TS" },
  { keywords: ["ramagundam"], city: "Ramagundam", stateId: "TS" },
  // Lakshadweep
  { keywords: ["kavaratti"], city: "Kavaratti", stateId: "LD" },
  // Andaman & Nicobar
  { keywords: ["port blair"], city: "Port Blair", stateId: "AN" },
  // Puducherry
  { keywords: ["puducherry", "pondicherry"], city: "Puducherry", stateId: "PY" },
  { keywords: ["karaikal"], city: "Karaikal", stateId: "PY" },
  // Chandigarh UT
  { keywords: ["chandigarh ut", "chandigarh union territory"], city: "Chandigarh", stateId: "CH" },
  // Dadra & Nagar Haveli / Daman & Diu
  { keywords: ["silvassa"], city: "Silvassa", stateId: "DN" },
  { keywords: ["daman"], city: "Daman", stateId: "DN" },
];

/**
 * Given a locality string, return the 2-letter state ID or null.
 * Tries each keyword group in order; first match wins.
 */
export const localityToStateId = (locality) => {
  if (!locality) return null;
  const lower = locality.toLowerCase();
  for (const entry of LOCALITY_KEYWORD_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.id;
    }
  }
  return null;
};

/**
 * Given a locality string, return { city: string, stateId: string } or null.
 * Uses CITY_KEYWORD_MAP (longer/more specific keywords first).
 */
const localityToCity = (locality) => {
  if (!locality) return null;
  const lower = locality.toLowerCase();
  for (const entry of CITY_KEYWORD_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return { city: entry.city, stateId: entry.stateId };
    }
  }
  return null;
};

/**
 * GET /analytics/map-stats
 * Returns per-state complaint aggregates + per-city counts derived from the
 * locality field.  Roles: CALL_OPERATOR and above (ABAC-scoped).
 */
export const getMapStats = async (user) => {
  const [abacFilter, tenantFilter] = await Promise.all([
    getABACFilter(user),
    Promise.resolve(forTenant(user)),
  ]);

  const complaints = await prisma.complaint.findMany({
    where: { isDeleted: false, ...tenantFilter, ...abacFilter },
    select: {
      locality: true,
      status: true,
      priority: true,
    },
    orderBy: { createdAt: "desc" },
    take: ANALYTICS_ROW_CAP,
  });

  // stateMap: id → { complaints, resolved, pending, critical, cities: Map<cityName, count> }
  const stateMap = {};
  const RESOLVED_STATUSES = new Set(["RESOLVED", "CLOSED"]);

  for (const c of complaints) {
    const stateId = localityToStateId(c.locality);
    if (!stateId) continue;

    if (!stateMap[stateId]) {
      stateMap[stateId] = { id: stateId, complaints: 0, resolved: 0, pending: 0, critical: 0, cities: {} };
    }

    const entry = stateMap[stateId];
    entry.complaints++;

    if (RESOLVED_STATUSES.has(c.status)) {
      entry.resolved++;
    } else {
      entry.pending++;
    }

    if (c.priority === "CRITICAL") {
      entry.critical++;
    }

    // City-level bucketing
    const cityMatch = localityToCity(c.locality);
    if (cityMatch && cityMatch.stateId === stateId) {
      entry.cities[cityMatch.city] = (entry.cities[cityMatch.city] ?? 0) + 1;
    }
  }

  // Convert cities Maps to sorted arrays
  const states = Object.values(stateMap).map((s) => ({
    id: s.id,
    complaints: s.complaints,
    resolved: s.resolved,
    pending: s.pending,
    critical: s.critical,
    cities: Object.entries(s.cities)
      .map(([name, count]) => ({ name, complaints: count }))
      .sort((a, b) => b.complaints - a.complaints),
  }));

  return {
    states,
    unlocatedCount: complaints.length - states.reduce((s, e) => s + e.complaints, 0),
  };
};
