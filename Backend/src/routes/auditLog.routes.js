import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeMinimum } from "../middlewares/role.middleware.js";
import * as controller from "../controllers/auditLog.controller.js";

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeMinimum("ADMIN"));

/**
 * GET /api/audit-logs
 *   ?page, limit, action, entityType, entityId, userId, from, to
 *   Returns paginated audit log entries for the caller's tenant.
 */
router.get("/", controller.getLogs);

/**
 * GET /api/audit-logs/actions
 *   Returns distinct action names for this tenant (for filter dropdowns).
 */
router.get("/actions", controller.getActions);

export default router;
