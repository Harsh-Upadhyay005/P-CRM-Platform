import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as service from "../services/departments.service.js";
import { writeAuditLog } from "../services/auditLog.service.js";

export const createDepartment = asyncHandler(async (req, res) => {
  const dept = await service.createDepartment(req.body, req.user);
  writeAuditLog({
    tenantId:   dept.tenantId,
    userId:     req.user.userId,
    action:     "DEPARTMENT_CREATED",
    entityType: "Department",
    entityId:   dept.id,
    metadata:   { name: dept.name, slaHours: dept.slaHours },
  }).catch(() => {});
  res.status(201).json(new ApiResponse(201, dept, "Department created"));
});

export const listDepartments = asyncHandler(async (req, res) => {
  const result = await service.listDepartments(req.query, req.user);
  res.json(new ApiResponse(200, result, "Departments retrieved"));
});

export const getDepartment = asyncHandler(async (req, res) => {
  const dept = await service.getDepartment(req.params.id, req.user);
  res.json(new ApiResponse(200, dept, "Department retrieved"));
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const dept = await service.updateDepartment(req.params.id, req.body, req.user);
  writeAuditLog({
    tenantId:   dept.tenantId,
    userId:     req.user.userId,
    action:     "DEPARTMENT_UPDATED",
    entityType: "Department",
    entityId:   dept.id,
    metadata:   req.body,
  }).catch(() => {});
  res.json(new ApiResponse(200, dept, "Department updated"));
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  await service.softDeleteDepartment(req.params.id, req.user);
  writeAuditLog({
    tenantId:   req.user.tenantId,
    userId:     req.user.userId,
    action:     "DEPARTMENT_DELETED",
    entityType: "Department",
    entityId:   req.params.id,
    metadata:   null,
  }).catch(() => {});
  res.json(new ApiResponse(200, null, "Department deleted"));
});
