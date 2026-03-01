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

// ── CSV helper ────────────────────────────────────────────────────────────
const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[,"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (headers, rows) =>
  [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

/**
 * GET /analytics/export?report=overview|departments|officers|categories
 * Returns a role-scoped CSV download of the requested analytics report.
 * Defaults to `overview` when the `report` param is omitted.
 */
export const exportAnalytics = asyncHandler(async (req, res) => {
  const { report = "overview", ...queryParams } = req.query;
  let csv;
  let filename;

  if (report === "departments") {
    const data = await service.getDepartmentStats(req.user);
    const headers = ["Department", "Total", "Resolved", "In Progress", "Escalated", "Avg Resolution (hrs)"];
    const rows = data.map((d) => [
      d.department?.name ?? d.departmentId ?? "Unknown",
      d.total         ?? 0,
      d.resolved      ?? 0,
      d.inProgress    ?? 0,
      d.escalated     ?? 0,
      d.avgResolutionHours ?? "",
    ]);
    csv      = toCsv(headers, rows);
    filename = `analytics-departments-${new Date().toISOString().slice(0, 10)}.csv`;

  } else if (report === "officers") {
    const data = await service.getOfficerLeaderboard(req.user);
    const headers = ["Officer", "Assigned", "Resolved", "Avg Resolution (hrs)", "Avg Satisfaction"];
    const rows = data.map((o) => [
      o.officer?.name  ?? o.officerId ?? "Unknown",
      o.totalAssigned  ?? 0,
      o.resolvedCount  ?? 0,
      o.avgResolutionHours ?? "",
      o.avgSatisfaction    ?? "",
    ]);
    csv      = toCsv(headers, rows);
    filename = `analytics-officers-${new Date().toISOString().slice(0, 10)}.csv`;

  } else if (report === "categories") {
    const data    = await service.getCategoryDistribution(req.user);
    const headers = [
      "Category", "Total", "% of All",
      "Open", "In Progress", "Resolved",
      "Low", "Medium", "High", "Critical",
      "Avg Sentiment Score",
    ];
    const rows = (data.categories ?? []).map((c) => [
      c.category             ?? "Uncategorized",
      c.total                ?? 0,
      c.percentage           ?? 0,
      c.byStatus?.OPEN       ?? 0,
      c.byStatus?.IN_PROGRESS ?? 0,
      c.byStatus?.RESOLVED   ?? 0,
      c.byPriority?.LOW      ?? 0,
      c.byPriority?.MEDIUM   ?? 0,
      c.byPriority?.HIGH     ?? 0,
      c.byPriority?.CRITICAL ?? 0,
      c.avgSentimentScore    ?? "",
    ]);
    csv      = toCsv(headers, rows);
    filename = `analytics-categories-${new Date().toISOString().slice(0, 10)}.csv`;

  } else {
    // default: overview
    const data    = await service.getOverview(req.user, queryParams);
    const headers = ["Metric", "Value"];
    const rows = [
      ["Total Complaints",  data.total                   ?? 0],
      ["Open",             data.byStatus?.OPEN           ?? 0],
      ["Assigned",         data.byStatus?.ASSIGNED       ?? 0],
      ["In Progress",      data.byStatus?.IN_PROGRESS    ?? 0],
      ["Escalated",        data.byStatus?.ESCALATED      ?? 0],
      ["Resolved",         data.byStatus?.RESOLVED       ?? 0],
      ["Closed",           data.byStatus?.CLOSED         ?? 0],
      ["Priority: Low",    data.byPriority?.LOW          ?? 0],
      ["Priority: Medium", data.byPriority?.MEDIUM       ?? 0],
      ["Priority: High",   data.byPriority?.HIGH         ?? 0],
      ["Priority: Critical",data.byPriority?.CRITICAL    ?? 0],
      ["SLA Active",       data.sla?.activeComplaints    ?? 0],
      ["SLA Breached",     data.sla?.breachedCount       ?? 0],
      ["SLA Breach %",     data.sla?.breachPercentage    ?? 0],
      ["Avg Resolution",   data.avgResolutionTime        ?? "N/A"],
      ["Resolved Count",   data.resolvedCount            ?? 0],
    ];
    csv      = toCsv(headers, rows);
    filename = `analytics-overview-${new Date().toISOString().slice(0, 10)}.csv`;
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\uFEFF" + csv); // UTF-8 BOM for Excel compatibility
});
