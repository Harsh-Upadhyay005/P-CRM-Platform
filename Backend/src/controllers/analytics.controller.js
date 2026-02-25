import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as service from "../services/analytics.service.js";

export const getOverview = asyncHandler(async (req, res) => {
  const data = await service.getOverview(req.user, req.query);
  res.json(new ApiResponse(200, data, "Analytics overview retrieved"));
});

export const getDepartmentStats = asyncHandler(async (req, res) => {
  const data = await service.getDepartmentStats(req.user);
  res.json(new ApiResponse(200, data, "Department statistics retrieved"));
});

export const getTrends = asyncHandler(async (req, res) => {
  const data = await service.getTrends(req.user, req.query);
  res.json(new ApiResponse(200, data, "Trends retrieved"));
});

export const getOfficerLeaderboard = asyncHandler(async (req, res) => {
  const data = await service.getOfficerLeaderboard(req.user);
  res.json(new ApiResponse(200, data, "Officer leaderboard retrieved"));
});

export const getSlaHeatmap = asyncHandler(async (req, res) => {
  const data = await service.getSlaHeatmap(req.user, req.query);
  res.json(new ApiResponse(200, data, "SLA heatmap retrieved"));
});

export const getEscalationTrend = asyncHandler(async (req, res) => {
  const data = await service.getEscalationTrend(req.user, req.query);
  res.json(new ApiResponse(200, data, "Escalation trend retrieved"));
});

export const getCategoryDistribution = asyncHandler(async (req, res) => {
  const data = await service.getCategoryDistribution(req.user);
  res.json(new ApiResponse(200, data, "Category distribution retrieved"));
});
