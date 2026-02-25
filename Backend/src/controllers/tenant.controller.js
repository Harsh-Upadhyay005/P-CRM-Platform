import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as tenantService from "../services/tenant.service.js";

export const listTenants = asyncHandler(async (req, res) => {
  const data = await tenantService.listTenants(req.query);
  res.json(new ApiResponse(200, data, "Tenants retrieved"));
});

export const getTenant = asyncHandler(async (req, res) => {
  const data = await tenantService.getTenantById(req.params.id);
  res.json(new ApiResponse(200, data, "Tenant retrieved"));
});

export const createTenant = asyncHandler(async (req, res) => {
  const data = await tenantService.createTenant(req.body);
  res.status(201).json(new ApiResponse(201, data, "Tenant created"));
});

export const updateTenant = asyncHandler(async (req, res) => {
  const data = await tenantService.updateTenant(req.params.id, req.body);
  res.json(new ApiResponse(200, data, "Tenant updated"));
});

export const deactivateTenant = asyncHandler(async (req, res) => {
  const data = await tenantService.deactivateTenant(req.params.id);
  res.json(new ApiResponse(200, data, "Tenant deactivated"));
});
