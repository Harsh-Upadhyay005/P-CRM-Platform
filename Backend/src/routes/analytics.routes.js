import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeMinimum } from "../middlewares/role.middleware.js";
import * as controller from "../controllers/analytics.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/overview",
  authorizeMinimum("DEPARTMENT_HEAD"),
  controller.getOverview,
);

router.get(
  "/trends",
  authorizeMinimum("DEPARTMENT_HEAD"),
  controller.getTrends,
);

router.get(
  "/departments",
  authorizeMinimum("DEPARTMENT_HEAD"),
  controller.getDepartmentStats,
);

router.get(
  "/officers",
  authorizeMinimum("DEPARTMENT_HEAD"),
  controller.getOfficerLeaderboard,
);

router.get(
  "/sla-heatmap",
  authorizeMinimum("DEPARTMENT_HEAD"),
  controller.getSlaHeatmap,
);

router.get(
  "/escalation-trends",
  authorizeMinimum("CALL_OPERATOR"),
  controller.getEscalationTrend,
);

router.get(
  "/category-distribution",
  authorizeMinimum("CALL_OPERATOR"),
  controller.getCategoryDistribution,
);

export default router;
