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
  authorizeMinimum("ADMIN"),
  controller.getDepartmentStats,
);

router.get(
  "/officers",
  authorizeMinimum("ADMIN"),
  controller.getOfficerLeaderboard,
);

export default router;
