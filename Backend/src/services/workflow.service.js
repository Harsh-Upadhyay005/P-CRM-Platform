import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, paginatedResponse } from "../utils/helpers.js";
import { notifyAssignment, notifyStatusChange } from "./notification.service.js";
import { sendOfficerAssignmentEmail, sendStatusChangeEmail } from "./email.service.js";

const DEFAULT_WORKFLOW_SETTING = Object.freeze({
  smartRoutingEnabled: true,
  autoCloseEnabled: true,
  autoCloseAfterDays: 7,
});

const FALLBACK_SLA_HOURS = 48;

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normalizeCategoryKey = (value) =>
  normalizeText(value).replace(/\s+/g, "-").slice(0, 120);

const parsePatternArray = (value = []) =>
  (Array.isArray(value) ? value : [])
    .map((v) => normalizeText(v))
    .filter(Boolean)
    .slice(0, 100);

const resolveTenantId = (user, bodyTenantId) => {
  if (user.role === "SUPER_ADMIN" && bodyTenantId) return bodyTenantId;
  if (!user.tenantId) {
    throw new ApiError(400, "tenantId is required");
  }
  return user.tenantId;
};

const getWorkflowSettingForTenant = async (tenantId) => {
  const setting = await prisma.workflowSetting.findUnique({
    where: { tenantId },
    select: {
      id: true,
      tenantId: true,
      smartRoutingEnabled: true,
      autoCloseEnabled: true,
      autoCloseAfterDays: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (setting) return setting;

  return {
    id: null,
    tenantId,
    ...DEFAULT_WORKFLOW_SETTING,
    createdAt: null,
    updatedAt: null,
  };
};

export const getWorkflowSettings = async (user, { tenantId } = {}) => {
  const scopedTenantId = resolveTenantId(user, tenantId);
  return getWorkflowSettingForTenant(scopedTenantId);
};

export const updateWorkflowSettings = async (user, data) => {
  const scopedTenantId = resolveTenantId(user, data.tenantId);

  const payload = {};
  if (data.smartRoutingEnabled !== undefined) payload.smartRoutingEnabled = data.smartRoutingEnabled;
  if (data.autoCloseEnabled !== undefined) payload.autoCloseEnabled = data.autoCloseEnabled;
  if (data.autoCloseAfterDays !== undefined) payload.autoCloseAfterDays = data.autoCloseAfterDays;

  if (Object.keys(payload).length === 0) {
    throw new ApiError(400, "At least one setting field must be provided");
  }

  return prisma.workflowSetting.upsert({
    where: { tenantId: scopedTenantId },
    create: { tenantId: scopedTenantId, ...DEFAULT_WORKFLOW_SETTING, ...payload },
    update: payload,
    select: {
      id: true,
      tenantId: true,
      smartRoutingEnabled: true,
      autoCloseEnabled: true,
      autoCloseAfterDays: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const assignmentRuleSelect = {
  id: true,
  tenantId: true,
  name: true,
  description: true,
  isActive: true,
  priority: true,
  stopOnMatch: true,
  categoryPatterns: true,
  areaPatterns: true,
  keywordPatterns: true,
  setPriority: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, name: true, slug: true } },
  assignee: { select: { id: true, name: true, email: true, departmentId: true, role: { select: { type: true } } } },
  createdBy: { select: { id: true, name: true } },
};

const getValidatedRuleTargets = async (tenantId, { departmentId, assignToId }) => {
  let resolvedDepartmentId = departmentId ?? undefined;
  let resolvedAssigneeId = assignToId ?? undefined;

  if (resolvedDepartmentId !== undefined && resolvedDepartmentId !== null) {
    const dept = await prisma.department.findFirst({
      where: { id: resolvedDepartmentId, tenantId, isDeleted: false, isActive: true },
      select: { id: true },
    });
    if (!dept) throw new ApiError(404, "Target department not found");
  }

  if (resolvedAssigneeId !== undefined && resolvedAssigneeId !== null) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: resolvedAssigneeId,
        tenantId,
        isDeleted: false,
        isActive: true,
        role: { type: { in: ["OFFICER", "DEPARTMENT_HEAD", "ADMIN"] } },
      },
      select: { id: true },
    });
    if (!assignee) {
      throw new ApiError(404, "Target assignee not found or not eligible");
    }
  }

  return { resolvedDepartmentId, resolvedAssigneeId };
};

export const listAssignmentRules = async (user, query = {}) => {
  const { page, limit, skip } = getPagination(query);
  const tenantId = resolveTenantId(user, query.tenantId);

  const where = {
    tenantId,
    ...(query.isActive !== undefined && { isActive: query.isActive === "true" }),
    ...(query.search && { name: { contains: query.search, mode: "insensitive" } }),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.automationAssignmentRule.findMany({
      where,
      select: assignmentRuleSelect,
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      skip,
      take: limit,
    }),
    prisma.automationAssignmentRule.count({ where }),
  ]);

  return paginatedResponse(rows, total, page, limit);
};

export const createAssignmentRule = async (user, data) => {
  const tenantId = resolveTenantId(user, data.tenantId);
  const { resolvedDepartmentId, resolvedAssigneeId } = await getValidatedRuleTargets(tenantId, data);

  const created = await prisma.automationAssignmentRule.create({
    data: {
      tenantId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      isActive: data.isActive ?? true,
      priority: data.priority ?? 100,
      stopOnMatch: data.stopOnMatch ?? true,
      categoryPatterns: parsePatternArray(data.categoryPatterns),
      areaPatterns: parsePatternArray(data.areaPatterns),
      keywordPatterns: parsePatternArray(data.keywordPatterns),
      departmentId: resolvedDepartmentId ?? null,
      assignToId: resolvedAssigneeId ?? null,
      setPriority: data.setPriority ?? null,
      createdById: user.userId ?? null,
    },
    select: assignmentRuleSelect,
  });

  return created;
};

export const updateAssignmentRule = async (user, id, data) => {
  const existing = await prisma.automationAssignmentRule.findFirst({
    where: { id, tenantId: resolveTenantId(user, data.tenantId) },
    select: { id: true, tenantId: true },
  });

  if (!existing) throw new ApiError(404, "Assignment rule not found");

  const hasTargetUpdate = data.departmentId !== undefined || data.assignToId !== undefined;
  const { resolvedDepartmentId, resolvedAssigneeId } = hasTargetUpdate
    ? await getValidatedRuleTargets(existing.tenantId, data)
    : { resolvedDepartmentId: undefined, resolvedAssigneeId: undefined };

  const payload = {
    ...(data.name !== undefined && { name: data.name.trim() }),
    ...(data.description !== undefined && { description: data.description?.trim() || null }),
    ...(data.isActive !== undefined && { isActive: data.isActive }),
    ...(data.priority !== undefined && { priority: data.priority }),
    ...(data.stopOnMatch !== undefined && { stopOnMatch: data.stopOnMatch }),
    ...(data.categoryPatterns !== undefined && { categoryPatterns: parsePatternArray(data.categoryPatterns) }),
    ...(data.areaPatterns !== undefined && { areaPatterns: parsePatternArray(data.areaPatterns) }),
    ...(data.keywordPatterns !== undefined && { keywordPatterns: parsePatternArray(data.keywordPatterns) }),
    ...(data.setPriority !== undefined && { setPriority: data.setPriority }),
    ...(data.departmentId !== undefined && { departmentId: resolvedDepartmentId ?? null }),
    ...(data.assignToId !== undefined && { assignToId: resolvedAssigneeId ?? null }),
  };

  if (Object.keys(payload).length === 0) {
    throw new ApiError(400, "At least one field must be provided");
  }

  return prisma.automationAssignmentRule.update({
    where: { id },
    data: payload,
    select: assignmentRuleSelect,
  });
};

export const deleteAssignmentRule = async (user, id, { tenantId } = {}) => {
  const scopedTenantId = resolveTenantId(user, tenantId);

  const existing = await prisma.automationAssignmentRule.findFirst({
    where: { id, tenantId: scopedTenantId },
    select: { id: true },
  });
  if (!existing) throw new ApiError(404, "Assignment rule not found");

  await prisma.automationAssignmentRule.delete({ where: { id } });
};

const categorySlaSelect = {
  id: true,
  tenantId: true,
  categoryKey: true,
  categoryLabel: true,
  slaHours: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

export const listCategorySlaPolicies = async (user, query = {}) => {
  const tenantId = resolveTenantId(user, query.tenantId);

  return prisma.categorySlaPolicy.findMany({
    where: {
      tenantId,
      ...(query.isActive !== undefined && { isActive: query.isActive === "true" }),
    },
    select: categorySlaSelect,
    orderBy: { categoryLabel: "asc" },
  });
};

export const upsertCategorySlaPolicy = async (user, data) => {
  const tenantId = resolveTenantId(user, data.tenantId);
  const categoryLabel = data.categoryLabel?.trim();
  const categoryKey = normalizeCategoryKey(data.categoryKey ?? categoryLabel);

  if (!categoryKey) {
    throw new ApiError(400, "categoryLabel or categoryKey is required");
  }

  if (!categoryLabel) {
    throw new ApiError(400, "categoryLabel is required");
  }

  return prisma.categorySlaPolicy.upsert({
    where: { tenantId_categoryKey: { tenantId, categoryKey } },
    create: {
      tenantId,
      categoryKey,
      categoryLabel,
      slaHours: data.slaHours,
      isActive: data.isActive ?? true,
    },
    update: {
      categoryLabel,
      slaHours: data.slaHours,
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    select: categorySlaSelect,
  });
};

export const deleteCategorySlaPolicy = async (user, id, { tenantId } = {}) => {
  const scopedTenantId = resolveTenantId(user, tenantId);

  const existing = await prisma.categorySlaPolicy.findFirst({
    where: { id, tenantId: scopedTenantId },
    select: { id: true },
  });
  if (!existing) throw new ApiError(404, "Category SLA policy not found");

  await prisma.categorySlaPolicy.delete({ where: { id } });
};

export const buildCategorySlaLookupForComplaints = async (complaints) => {
  const validComplaints = (complaints ?? []).filter(Boolean);

  const pairs = validComplaints
    .map((c) => ({ tenantId: c.tenantId, categoryKey: normalizeCategoryKey(c.category) }))
    .filter((p) => p.tenantId && p.categoryKey);

  if (pairs.length === 0) return new Map();

  const tenantIds = [...new Set(pairs.map((p) => p.tenantId))];
  const categoryKeys = [...new Set(pairs.map((p) => p.categoryKey))];

  const policies = await prisma.categorySlaPolicy.findMany({
    where: {
      tenantId: { in: tenantIds },
      categoryKey: { in: categoryKeys },
      isActive: true,
    },
    select: { tenantId: true, categoryKey: true, slaHours: true },
  });

  const map = new Map();
  for (const p of policies) {
    map.set(`${p.tenantId}:${p.categoryKey}`, p.slaHours);
  }

  return map;
};

export const resolveEffectiveSlaHours = (complaint, policyLookup = new Map()) => {
  const categoryKey = normalizeCategoryKey(complaint?.category);
  const lookupKey = categoryKey ? `${complaint?.tenantId}:${categoryKey}` : null;

  if (lookupKey && policyLookup.has(lookupKey)) {
    return policyLookup.get(lookupKey);
  }

  return complaint?.department?.slaHours ?? FALLBACK_SLA_HOURS;
};

const tokenSet = (text) => new Set(normalizeText(text).split(" ").filter(Boolean));

const scoreDepartmentForComplaint = (department, complaint, inferredCategory) => {
  let score = 0;

  const locality = normalizeText(complaint.locality);
  const description = normalizeText(complaint.description);
  const category = normalizeText(complaint.category || inferredCategory);

  for (const area of department.serviceAreas ?? []) {
    const normalizedArea = normalizeText(area);
    if (!normalizedArea || !locality) continue;
    if (locality === normalizedArea) score += 10;
    else if (locality.includes(normalizedArea) || normalizedArea.includes(locality)) score += 7;
  }

  for (const tag of department.categoryTags ?? []) {
    const normalizedTag = normalizeText(tag);
    if (!normalizedTag || !category) continue;
    if (category === normalizedTag) score += 8;
    else if (category.includes(normalizedTag) || normalizedTag.includes(category)) score += 5;
  }

  const descTokens = tokenSet(description);
  for (const keyword of department.routingKeywords ?? []) {
    const k = normalizeText(keyword);
    if (!k) continue;

    if (description.includes(k)) {
      score += 2;
      continue;
    }

    const parts = k.split(" ").filter(Boolean);
    if (parts.length === 0) continue;
    const overlap = parts.filter((p) => descTokens.has(p)).length;
    if (overlap > 0) score += overlap;
  }

  if (category && department.name && normalizeText(department.name).includes(category)) {
    score += 2;
  }

  return score;
};

const CATEGORY_HINTS = [
  { category: "water", keywords: ["water", "pipe", "drinking", "tap", "supply", "leak"] },
  { category: "road", keywords: ["road", "street", "pothole", "asphalt", "traffic", "bridge"] },
  { category: "electricity", keywords: ["electricity", "power", "transformer", "voltage", "blackout"] },
  { category: "sanitation", keywords: ["garbage", "sewage", "drain", "waste", "cleaning", "toilet"] },
];

const inferComplaintCategory = (complaint) => {
  if (complaint.category) return normalizeText(complaint.category);

  const text = normalizeText(complaint.description);
  if (!text) return "";

  let bestCategory = "";
  let bestScore = 0;

  for (const hint of CATEGORY_HINTS) {
    const score = hint.keywords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = hint.category;
    }
  }

  return bestCategory;
};

const ruleMatchesComplaint = (rule, complaint, inferredCategory) => {
  const category = normalizeText(complaint.category || inferredCategory);
  const locality = normalizeText(complaint.locality);
  const description = normalizeText(complaint.description);

  const categoryPatterns = parsePatternArray(rule.categoryPatterns);
  const areaPatterns = parsePatternArray(rule.areaPatterns);
  const keywordPatterns = parsePatternArray(rule.keywordPatterns);

  const categoryOk = categoryPatterns.length === 0 || categoryPatterns.some((p) => category.includes(p));
  const areaOk = areaPatterns.length === 0 || areaPatterns.some((p) => locality.includes(p));
  const keywordOk = keywordPatterns.length === 0 || keywordPatterns.some((p) => description.includes(p));

  return categoryOk && areaOk && keywordOk;
};

const getSystemActorId = async (tenantId, fallbackUserId = null) => {
  const actor = await prisma.user.findFirst({
    where: {
      tenantId,
      isDeleted: false,
      isActive: true,
      role: { type: { in: ["ADMIN", "SUPER_ADMIN", "DEPARTMENT_HEAD", "OFFICER"] } },
    },
    orderBy: [{ roleId: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  return actor?.id ?? fallbackUserId ?? null;
};

const getRuleActionTargets = async (tenantId, rule, currentDepartmentId) => {
  let departmentId = null;
  let assignee = null;

  if (rule.departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: rule.departmentId, tenantId, isDeleted: false, isActive: true },
      select: { id: true },
    });
    departmentId = dept?.id ?? null;
  }

  if (rule.assignToId) {
    assignee = await prisma.user.findFirst({
      where: {
        id: rule.assignToId,
        tenantId,
        isDeleted: false,
        isActive: true,
        role: { type: { in: ["OFFICER", "DEPARTMENT_HEAD", "ADMIN"] } },
      },
      select: {
        id: true,
        name: true,
        email: true,
        departmentId: true,
      },
    });

    if (assignee) {
      const effectiveDept = departmentId ?? currentDepartmentId;
      if (effectiveDept && assignee.departmentId && assignee.departmentId !== effectiveDept) {
        assignee = null;
      }
    }
  }

  return { departmentId, assignee };
};

const resolveSmartRouteDepartment = async (tenantId, complaint, enabled) => {
  if (!enabled || complaint.departmentId) return null;

  const departments = await prisma.department.findMany({
    where: { tenantId, isDeleted: false, isActive: true },
    select: {
      id: true,
      name: true,
      serviceAreas: true,
      categoryTags: true,
      routingKeywords: true,
    },
  });

  if (departments.length === 0) return null;

  const inferredCategory = inferComplaintCategory(complaint);

  let best = null;
  for (const dept of departments) {
    const score = scoreDepartmentForComplaint(dept, complaint, inferredCategory);
    if (!best || score > best.score) {
      best = { id: dept.id, score };
    }
  }

  if (!best || best.score <= 0) return null;
  return best.id;
};

export const runComplaintAutomationOnCreate = async (complaintId) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    select: {
      id: true,
      isDeleted: true,
      tenantId: true,
      trackingId: true,
      status: true,
      priority: true,
      category: true,
      locality: true,
      description: true,
      citizenName: true,
      citizenEmail: true,
      createdById: true,
      assignedToId: true,
      departmentId: true,
    },
  });

  if (!complaint || complaint.isDeleted) return null;

  const settings = await getWorkflowSettingForTenant(complaint.tenantId);
  const inferredCategory = inferComplaintCategory(complaint);

  let workingDepartmentId = complaint.departmentId;
  let workingAssigneeId = complaint.assignedToId;
  let workingPriority = complaint.priority;
  let statusChanged = false;
  let assignedOfficer = null;

  const routedDepartmentId = await resolveSmartRouteDepartment(
    complaint.tenantId,
    complaint,
    settings.smartRoutingEnabled,
  );

  if (routedDepartmentId) {
    workingDepartmentId = routedDepartmentId;
  }

  const rules = await prisma.automationAssignmentRule.findMany({
    where: {
      tenantId: complaint.tenantId,
      isActive: true,
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      stopOnMatch: true,
      categoryPatterns: true,
      areaPatterns: true,
      keywordPatterns: true,
      departmentId: true,
      assignToId: true,
      setPriority: true,
    },
  });

  for (const rule of rules) {
    if (!ruleMatchesComplaint(rule, complaint, inferredCategory)) continue;

    const targets = await getRuleActionTargets(complaint.tenantId, rule, workingDepartmentId);

    if (targets.departmentId) {
      workingDepartmentId = targets.departmentId;
    }

    if (targets.assignee) {
      workingAssigneeId = targets.assignee.id;
      assignedOfficer = targets.assignee;
    }

    if (rule.setPriority) {
      workingPriority = rule.setPriority;
    }

    if (rule.stopOnMatch) break;
  }

  const shouldAssign = Boolean(workingAssigneeId);
  const newStatus = shouldAssign && complaint.status === "OPEN" ? "ASSIGNED" : complaint.status;
  statusChanged = newStatus !== complaint.status;

  const hasAnyUpdate =
    workingDepartmentId !== complaint.departmentId ||
    workingAssigneeId !== complaint.assignedToId ||
    workingPriority !== complaint.priority ||
    statusChanged;

  if (!hasAnyUpdate) {
    return null;
  }

  const actorId = await getSystemActorId(complaint.tenantId, complaint.createdById);

  const [updatedComplaint] = await prisma.$transaction([
    prisma.complaint.update({
      where: { id: complaint.id },
      data: {
        ...(workingDepartmentId !== complaint.departmentId && { departmentId: workingDepartmentId }),
        ...(workingAssigneeId !== complaint.assignedToId && { assignedToId: workingAssigneeId }),
        ...(workingPriority !== complaint.priority && { priority: workingPriority }),
        ...(statusChanged && { status: newStatus }),
      },
      select: {
        id: true,
        trackingId: true,
        citizenName: true,
        citizenEmail: true,
        createdById: true,
        assignedToId: true,
        priority: true,
        category: true,
        status: true,
      },
    }),
    ...(statusChanged && actorId
      ? [
          prisma.complaintStatusHistory.create({
            data: {
              complaintId: complaint.id,
              oldStatus: complaint.status,
              newStatus,
              changedById: actorId,
            },
          }),
        ]
      : []),
  ]);

  if (updatedComplaint.assignedToId) {
    notifyAssignment(
      updatedComplaint.id,
      updatedComplaint.assignedToId,
      updatedComplaint.createdById,
      actorId,
      updatedComplaint.trackingId,
    ).catch(() => {});

    if (assignedOfficer?.email) {
      sendOfficerAssignmentEmail(
        assignedOfficer.email,
        assignedOfficer.name,
        updatedComplaint.trackingId,
        updatedComplaint.category,
        updatedComplaint.priority,
      ).catch(() => {});
    }
  }

  if (statusChanged) {
    notifyStatusChange(
      updatedComplaint.id,
      complaint.status,
      newStatus,
      updatedComplaint.createdById,
      updatedComplaint.assignedToId,
      actorId,
      updatedComplaint.trackingId,
    ).catch(() => {});

    if (updatedComplaint.citizenEmail) {
      sendStatusChangeEmail(
        updatedComplaint.citizenEmail,
        updatedComplaint.citizenName,
        updatedComplaint.trackingId,
        complaint.status,
        newStatus,
      ).catch(() => {});
    }
  }

  return updatedComplaint;
};

export const runAutoCloseTick = async () => {
  const summary = { scanned: 0, closed: 0, errors: 0 };

  const settings = await prisma.workflowSetting.findMany({
    where: {
      autoCloseEnabled: true,
      autoCloseAfterDays: { gt: 0 },
    },
    select: {
      tenantId: true,
      autoCloseAfterDays: true,
    },
  });

  for (const setting of settings) {
    const cutoff = new Date(Date.now() - setting.autoCloseAfterDays * 86_400_000);

    const candidates = await prisma.complaint.findMany({
      where: {
        tenantId: setting.tenantId,
        isDeleted: false,
        status: "RESOLVED",
        resolvedAt: { not: null, lte: cutoff },
        feedback: { is: null },
      },
      select: {
        id: true,
        trackingId: true,
        tenantId: true,
        status: true,
        createdById: true,
        assignedToId: true,
        citizenName: true,
        citizenEmail: true,
      },
      orderBy: { resolvedAt: "asc" },
      take: 500,
    });

    summary.scanned += candidates.length;

    for (const complaint of candidates) {
      try {
        const actorId = await getSystemActorId(complaint.tenantId, complaint.createdById);
        if (!actorId) continue;

        const didClose = await prisma.$transaction(async (tx) => {
          const updated = await tx.complaint.updateMany({
            where: {
              id: complaint.id,
              tenantId: complaint.tenantId,
              isDeleted: false,
              status: "RESOLVED",
            },
            data: { status: "CLOSED" },
          });

          if (updated.count === 0) return false;

          await tx.complaintStatusHistory.create({
            data: {
              complaintId: complaint.id,
              oldStatus: "RESOLVED",
              newStatus: "CLOSED",
              changedById: actorId,
            },
          });

          return true;
        });

        if (!didClose) continue;

        notifyStatusChange(
          complaint.id,
          "RESOLVED",
          "CLOSED",
          complaint.createdById,
          complaint.assignedToId,
          actorId,
          complaint.trackingId,
        ).catch(() => {});

        if (complaint.citizenEmail) {
          sendStatusChangeEmail(
            complaint.citizenEmail,
            complaint.citizenName,
            complaint.trackingId,
            "RESOLVED",
            "CLOSED",
          ).catch(() => {});
        }

        summary.closed++;
      } catch {
        summary.errors++;
      }
    }
  }

  return summary;
};

export const getAutoCloseTenants = async () => {
  return prisma.workflowSetting.findMany({
    where: {
      autoCloseEnabled: true,
      autoCloseAfterDays: { gt: 0 },
    },
    select: {
      tenantId: true,
      autoCloseAfterDays: true,
    },
  });
};
