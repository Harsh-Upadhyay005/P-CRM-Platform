import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as service from "../services/departments.service.js";

export const createDepartment = asyncHandler(async (req, res) => {
  const dept = await service.createDepartment(req.body, req.user);
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
  res.json(new ApiResponse(200, dept, "Department updated"));
});

export const deleteDepartment = asyncHandler(async (req, res) => {
  await service.softDeleteDepartment(req.params.id, req.user);
  res.json(new ApiResponse(200, null, "Department deleted"));
});
