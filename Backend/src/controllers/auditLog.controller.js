import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as service from "../services/auditLog.service.js";

export const getLogs = asyncHandler(async (req, res) => {
  const result = await service.listAuditLogs(req.user, req.query);
  res.json(new ApiResponse(200, result, "Audit logs retrieved"));
});

export const getActions = asyncHandler(async (req, res) => {
  const actions = await service.listAuditActions(req.user);
  res.json(new ApiResponse(200, actions, "Audit actions retrieved"));
});
