import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorize, authorizeMinimum } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import * as controller from "../controllers/users.controller.js";
import {
  assignRoleSchema,
  setUserStatusSchema,
  updateMyProfileSchema,
  changePasswordSchema,
  createUserSchema,
} from "../validators/users.validators.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/me", controller.getMe);

router.patch("/me", validate(updateMyProfileSchema), controller.updateMyProfile);

router.patch(
  "/me/password",
  validate(changePasswordSchema),
  controller.changePassword,
);

router.get(
  "/",
  authorizeMinimum("DEPARTMENT_HEAD"),
  controller.listUsers,
);

router.post(
  "/",
  authorizeMinimum("ADMIN"),
  validate(createUserSchema),
  controller.createUser,
);

router.get(
  "/:id",
  authorizeMinimum("DEPARTMENT_HEAD"),
  controller.getUserById,
);

router.patch(
  "/:id/role",
  authorizeMinimum("ADMIN"),
  validate(assignRoleSchema),
  controller.assignRole,
);

router.patch(
  "/:id/status",
  authorizeMinimum("ADMIN"),
  validate(setUserStatusSchema),
  controller.setUserActiveStatus,
);

router.delete(
  "/:id",
  authorizeMinimum("ADMIN"),
  controller.deleteUser,
);

export default router;
