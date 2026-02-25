import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { forTenant } from "../utils/tenantScope.js";
import { isSlaBreached, NON_SLA_STATUSES } from "../utils/slaEngine.js";

// Max rows pulled per analytics sub-query to protect the DB under high complaint volume.
// Real-time aggregation at this scale is intentional; a background cache/materialized view
// should be introduced if complaint counts exceed this threshold per tenant.
const ANALYTICS_ROW_CAP = 5_000;

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
    orderBy: { createdAt: "desc" },
    take:    ANALYTICS_ROW_CAP,
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
    select:  { createdAt: true, resolvedAt: true },
    orderBy: { resolvedAt: "desc" },
    take:    ANALYTICS_ROW_CAP,
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
  if (!["ADMIN", "SUPER_ADMIN", "DEPARTMENT_HEAD"].includes(user.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const tenantFilter = forTenant(user);
  const baseWhere    = { isDeleted: false, ...tenantFilter };

  let deptIdFilter = {};
  if (user.role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where:  { id: user.userId },
      select: { departmentId: true },
    });
    if (!dbUser?.departmentId) {
      throw new ApiError(403, "Department head is not assigned to any department");
    }
    deptIdFilter = { id: dbUser.departmentId };
  }

  const departments = await prisma.department.findMany({
    where:  { isDeleted: false, ...tenantFilter, ...deptIdFilter },
    select: { id: true, name: true, slug: true, slaHours: true },
  });

  if (departments.length === 0) return [];

  const deptIds            = departments.map((d) => d.id);
  const deptComplaintFilter = { departmentId: { in: deptIds } };

  const [grouped, activeComplaints, resolvedComplaints] = await Promise.all([
    prisma.complaint.groupBy({
      by:    ["departmentId", "status"],
      where: { ...baseWhere, ...deptComplaintFilter },
      _count: { _all: true },
    }),
    prisma.complaint.findMany({
      where: { ...baseWhere, ...deptComplaintFilter, status: { notIn: NON_SLA_STATUSES } },
      select: {
        departmentId: true,
        createdAt:    true,
        department:   { select: { slaHours: true } },
      },
      orderBy: { createdAt: "desc" },
      take:    ANALYTICS_ROW_CAP,
    }),
    prisma.complaint.findMany({
      where: {
        ...baseWhere,
        ...deptComplaintFilter,
        status:     { in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { not: null },
      },
      select:  { departmentId: true, createdAt: true, resolvedAt: true },
      orderBy: { resolvedAt: "desc" },
      take:    ANALYTICS_ROW_CAP,
    }),
  ]);

  const byDeptStatus   = {};
  const byDeptActive   = {};
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

  return departments.map((dept) => {
    const statusMap = byDeptStatus[dept.id]  ?? {};
    const active    = byDeptActive[dept.id]  ?? [];
    const resolved  = byDeptResolved[dept.id] ?? [];

    const total      = Object.values(statusMap).reduce((s, n) => s + n, 0);
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
        activeCount:   active.length,
        breachedCount: slaBreached,
        breachPct:     active.length > 0
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
  const week1   = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
};

export const getTrends = async (user, query = {}) => {
  const granularity = query.granularity === "weekly" ? "weekly" : "daily";
  const maxDays     = granularity === "weekly" ? 364 : 90;
  const defaultDays = granularity === "weekly" ? 84  : 30;
  const days        = Math.min(Math.max(parseInt(query.days) || defaultDays, 7), maxDays);

  const [abacFilter, tenantFilter] = await Promise.all([
    getABACFilter(user),
    Promise.resolve(forTenant(user)),
  ]);

  const since     = new Date(Date.now() - days * 86_400_000);
  const baseWhere = {
    isDeleted: false,
    ...tenantFilter,
    ...abacFilter,
    createdAt: { gte: since },
  };

  const complaints = await prisma.complaint.findMany({
    where:   baseWhere,
    select:  { createdAt: true, status: true },
    orderBy: { createdAt: "asc" },
    take:    ANALYTICS_ROW_CAP,
  });

  if (granularity === "weekly") {
    const buckets = {};
    for (let i = 0; i < days; i++) {
      const key = getISOWeekKey(new Date(since.getTime() + i * 86_400_000));
      if (!buckets[key]) buckets[key] = { week: key, total: 0, resolved: 0, escalated: 0 };
    }
    for (const c of complaints) {
      const key = getISOWeekKey(c.createdAt);
      if (buckets[key]) {
        buckets[key].total++;
        if (c.status === "RESOLVED" || c.status === "CLOSED") buckets[key].resolved++;
        if (c.status === "ESCALATED") buckets[key].escalated++;
      }
    }
    return { granularity, days, since: since.toISOString(), data: Object.values(buckets) };
  }

  const buckets = {};
  for (let i = 0; i < days; i++) {
    const d   = new Date(since.getTime() + i * 86_400_000);
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
      where:  { id: user.userId },
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
      by:    ["assignedToId", "status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.complaint.findMany({
      where: { ...baseWhere, status: { in: ["RESOLVED", "CLOSED"] }, resolvedAt: { not: null } },
      select: {
        assignedToId: true,
        createdAt:    true,
        resolvedAt:   true,
        department:   { select: { slaHours: true } },
      },
      orderBy: { resolvedAt: "desc" },
      take:    ANALYTICS_ROW_CAP,
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
      orderBy: { createdAt: "desc" },
      take:    ANALYTICS_ROW_CAP,
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

    const resolvedWithinSla = resolved.filter((c) => {
      const deadline = new Date(c.createdAt).getTime() + (c.department?.slaHours ?? 48) * 3_600_000;
      return new Date(c.resolvedAt).getTime() <= deadline;
    }).length;

    return {
      officer:           officerMap[oid] ?? { id: oid },
      totalAssigned,
      resolvedCount,
      openCount:         (statusMap.IN_PROGRESS ?? 0) + (statusMap.ASSIGNED ?? 0),
      escalatedCount:    statusMap.ESCALATED ?? 0,
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
      entry.slaComplianceRate >= 80    ? "TOP" :
      entry.slaComplianceRate >= 50    ? "AVERAGE" : "NEEDS_IMPROVEMENT",
  }));
};

export const getSlaHeatmap = async (user, query = {}) => {
  if (![ "ADMIN", "SUPER_ADMIN", "DEPARTMENT_HEAD"].includes(user.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const granularity  = query.granularity === "daily" ? "daily" : "weekly";
  const maxDays      = granularity === "daily" ? 90 : 364;
  const defaultDays  = granularity === "daily" ? 30 : 84;
  const days         = Math.min(Math.max(parseInt(query.days) || defaultDays, 7), maxDays);

  const tenantFilter = forTenant(user);
  let deptIdFilter   = {};

  if (user.role === "DEPARTMENT_HEAD") {
    const dbUser = await prisma.user.findUnique({
      where:  { id: user.userId },
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
      where:  { isDeleted: false, isActive: true, ...tenantFilter, ...deptIdFilter },
      select: { id: true, name: true, slug: true, slaHours: true },
    }),
    prisma.complaint.findMany({
      where: {
        isDeleted: false,
        ...tenantFilter,
        departmentId: { not: null },
        ...(deptIdFilter.id && { departmentId: deptIdFilter.id }),
        createdAt: { gte: since },
        status:    { not: "ESCALATED" },
      },
      select: {
        departmentId: true,
        createdAt:    true,
        resolvedAt:   true,
        status:       true,
      },
      orderBy: { createdAt: "asc" },
      take:    ANALYTICS_ROW_CAP,
    }),
  ]);

  if (departments.length === 0) {
    return { granularity, since: since.toISOString(), periods: [], departments: [] };
  }

  const deptMap  = Object.fromEntries(departments.map((d) => [d.id, d]));
  const now      = Date.now();
  const periods  = [];
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

  for (const c of complaints) {
    if (!c.departmentId || !matrix[c.departmentId]) continue;

    const periodKey = granularity === "weekly"
      ? getISOWeekKey(c.createdAt)
      : new Date(c.createdAt).toISOString().slice(0, 10);

    if (!periodSet.has(periodKey)) continue;

    const cell     = matrix[c.departmentId][periodKey];
    const slaHours = deptMap[c.departmentId]?.slaHours ?? 48;
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
    since:       since.toISOString(),
    periods,
    departments: departments.map((dept) => ({
      id:       dept.id,
      name:     dept.name,
      slug:     dept.slug,
      slaHours: dept.slaHours,
      heatmap:  periods.map((p) => {
        const cell = matrix[dept.id][p];
        return {
          period:    p,
          total:     cell.total,
          breached:  cell.breached,
          breachPct: cell.total > 0
            ? +((cell.breached / cell.total) * 100).toFixed(1)
            : null,
        };
      }),
    })),
  };
};

export const getEscalationTrend = async (user, query = {}) => {
  const granularity  = query.granularity === "weekly" ? "weekly" : "daily";
  const maxDays      = granularity === "weekly" ? 364 : 90;
  const defaultDays  = granularity === "weekly" ? 84  : 30;
  const days         = Math.min(Math.max(parseInt(query.days) || defaultDays, 7), maxDays);

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
      select: {
        changedAt: true,
        complaint: {
          select: {
            departmentId: true,
            department:   { select: { id: true, name: true } },
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
      select:  { createdAt: true },
      orderBy: { createdAt: "asc" },
      take:    ANALYTICS_ROW_CAP,
    }),
  ]);

  const periods  = [];
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

  const totalBucket      = Object.fromEntries(periods.map((p) => [p, 0]));
  const escalationBucket = Object.fromEntries(periods.map((p) => [p, 0]));
  const deptEscalations  = {};

  for (const c of allComplaints) {
    const key = granularity === "weekly"
      ? getISOWeekKey(c.createdAt)
      : new Date(c.createdAt).toISOString().slice(0, 10);
    if (key in totalBucket) totalBucket[key]++;
  }

  for (const e of escalationEvents) {
    const key = granularity === "weekly"
      ? getISOWeekKey(e.changedAt)
      : new Date(e.changedAt).toISOString().slice(0, 10);
    if (key in escalationBucket) escalationBucket[key]++;

    const deptId = e.complaint.departmentId;
    if (deptId) {
      if (!deptEscalations[deptId]) {
        deptEscalations[deptId] = {
          id:    deptId,
          name:  e.complaint.department?.name ?? "Unknown",
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
    escalations:    escalationBucket[p],
    total:          totalBucket[p],
    escalationRate: totalBucket[p] > 0
      ? +((escalationBucket[p] / totalBucket[p]) * 100).toFixed(1)
      : 0,
  }));

  const totalEscalations = escalationEvents.length;
  const totalCreated     = allComplaints.length;

  return {
    granularity,
    days,
    since: since.toISOString(),
    summary: {
      totalEscalations,
      totalComplaints:       totalCreated,
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
      by:    ["category", "status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.complaint.groupBy({
      by:    ["category", "priority"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.complaint.groupBy({
      by:    ["category"],
      where: { ...baseWhere, sentimentScore: { not: null } },
      _avg:  { sentimentScore: true },
      _count: { _all: true },
    }),
  ]);

  const total              = byStatus.reduce((s, r) => s + r._count._all, 0);
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

  const STATUS_LIST   = ["OPEN", "ASSIGNED", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"];
  const PRIORITY_LIST = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  const buildEntry = (cat) => ({
    category:          cat.category,
    total:             cat.total,
    percentage:        total > 0 ? +((cat.total / total) * 100).toFixed(1) : 0,
    byStatus:          Object.fromEntries(STATUS_LIST.map((s) => [s, cat.byStatus[s] ?? 0])),
    byPriority:        Object.fromEntries(PRIORITY_LIST.map((p) => [p, cat.byPriority[p] ?? 0])),
    avgSentimentScore: sentimentMap[cat.category ?? "__null__"] != null
      ? parseFloat(sentimentMap[cat.category ?? "__null__"].toFixed(4))
      : null,
  });

  const allEntries = Object.values(categoryMap)
    .map(buildEntry)
    .sort((a, b) => b.total - a.total);

  const categorized   = allEntries.filter((c) => c.category !== null);
  const uncategorized = allEntries.find((c) => c.category === null) ?? null;

  return {
    total,
    uncategorized: uncategorizedCount,
    categories:             categorized,
    uncategorizedBreakdown: uncategorized,
  };
};
