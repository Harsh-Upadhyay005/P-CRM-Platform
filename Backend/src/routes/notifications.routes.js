import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import * as controller from "../controllers/notifications.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/",              controller.getNotifications);
router.get("/unread-count",  controller.getUnreadCount);
router.patch("/read-all",    controller.markAllRead);
router.patch("/:id/read",    controller.markRead);

export default router;
