import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as service from "../services/workflow.service.js";
import { writeAuditLog } from "../services/auditLog.service.js";

const getEffectiveAuditTenantId = (user, queryTenantId) =>
  user.role === "SUPER_ADMIN" && queryTenantId ? queryTenantId : user.tenantId;

export const getWorkflowSettings = asyncHandler(async (req, res) => {
  const settings = await service.getWorkflowSettings(req.user, req.query);
  res.json(new ApiResponse(200, settings, "Workflow settings retrieved"));
});

export const updateWorkflowSettings = asyncHandler(async (req, res) => {
  const settings = await service.updateWorkflowSettings(req.user, req.body);

  writeAuditLog({
    tenantId: settings.tenantId,
    userId: req.user.userId,
    action: "WORKFLOW_SETTINGS_UPDATED",
    entityType: "Workflow",
    entityId: settings.id ?? settings.tenantId,
    metadata: req.body,
  }).catch(() => {});

  res.json(new ApiResponse(200, settings, "Workflow settings updated"));
});

export const listAssignmentRules = asyncHandler(async (req, res) => {
  const result = await service.listAssignmentRules(req.user, req.query);
  res.json(new ApiResponse(200, result, "Assignment rules retrieved"));
});

export const createAssignmentRule = asyncHandler(async (req, res) => {
  const rule = await service.createAssignmentRule(req.user, req.body);

  writeAuditLog({
    tenantId: rule.tenantId,
    userId: req.user.userId,
    action: "WORKFLOW_ASSIGNMENT_RULE_CREATED",
    entityType: "Workflow",
    entityId: rule.id,
    metadata: {
      name: rule.name,
      priority: rule.priority,
      departmentId: rule.department?.id ?? null,
      assignToId: rule.assignee?.id ?? null,
    },
  }).catch(() => {});

  res.status(201).json(new ApiResponse(201, rule, "Assignment rule created"));
});

export const updateAssignmentRule = asyncHandler(async (req, res) => {
  const rule = await service.updateAssignmentRule(req.user, req.params.id, req.body);

  writeAuditLog({
    tenantId: rule.tenantId,
    userId: req.user.userId,
    action: "WORKFLOW_ASSIGNMENT_RULE_UPDATED",
    entityType: "Workflow",
    entityId: rule.id,
    metadata: req.body,
  }).catch(() => {});

  res.json(new ApiResponse(200, rule, "Assignment rule updated"));
});

export const deleteAssignmentRule = asyncHandler(async (req, res) => {
  await service.deleteAssignmentRule(req.user, req.params.id, req.query);
  writeAuditLog({
    tenantId: getEffectiveAuditTenantId(req.user, req.query?.tenantId),
    userId: req.user.userId,
    action: "WORKFLOW_ASSIGNMENT_RULE_DELETED",
    entityType: "Workflow",
    entityId: req.params.id,
    metadata: null,
  }).catch(() => {});
  res.json(new ApiResponse(200, null, "Assignment rule deleted"));
});

export const listCategorySlaPolicies = asyncHandler(async (req, res) => {
  const policies = await service.listCategorySlaPolicies(req.user, req.query);
  res.json(new ApiResponse(200, policies, "Category SLA policies retrieved"));
});

export const upsertCategorySlaPolicy = asyncHandler(async (req, res) => {
  const policy = await service.upsertCategorySlaPolicy(req.user, req.body);

  writeAuditLog({
    tenantId: policy.tenantId,
    userId: req.user.userId,
    action: "WORKFLOW_CATEGORY_SLA_UPSERTED",
    entityType: "Workflow",
    entityId: policy.id,
    metadata: {
      categoryKey: policy.categoryKey,
      categoryLabel: policy.categoryLabel,
      slaHours: policy.slaHours,
      isActive: policy.isActive,
    },
  }).catch(() => {});

  res.json(new ApiResponse(200, policy, "Category SLA policy upserted"));
});

export const deleteCategorySlaPolicy = asyncHandler(async (req, res) => {
  await service.deleteCategorySlaPolicy(req.user, req.params.id, req.query);

  writeAuditLog({
    tenantId: getEffectiveAuditTenantId(req.user, req.query?.tenantId),
    userId: req.user.userId,
    action: "WORKFLOW_CATEGORY_SLA_DELETED",
    entityType: "Workflow",
    entityId: req.params.id,
    metadata: null,
  }).catch(() => {});

  res.json(new ApiResponse(200, null, "Category SLA policy deleted"));
});
