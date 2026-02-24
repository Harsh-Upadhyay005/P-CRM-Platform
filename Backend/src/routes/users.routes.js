import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorize, authorizeMinimum } from "../middlewares/role.middleware.js";
import * as controller from "../controllers/users.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/me", controller.getMe);

router.patch("/me", controller.updateMyProfile);

router.get(
  "/",
  authorizeMinimum("DEPARTMENT_HEAD"),
  controller.listUsers,
);

router.get(
  "/:id",
  authorizeMinimum("DEPARTMENT_HEAD"),
  controller.getUserById,
);

router.patch(
  "/:id/role",
  authorizeMinimum("ADMIN"),
  controller.assignRole,
);

router.patch(
  "/:id/status",
  authorizeMinimum("ADMIN"),
  controller.setUserActiveStatus,
);

router.delete(
  "/:id",
  authorizeMinimum("ADMIN"),
  controller.deleteUser,
);

export default router;
