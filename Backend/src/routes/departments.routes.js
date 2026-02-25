import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeMinimum } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import * as controller from "../controllers/departments.controller.js";
import { createDepartmentSchema, updateDepartmentSchema } from "../validators/departments.validators.js";

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/",
  authorizeMinimum("CALL_OPERATOR"),
  controller.listDepartments,
);

router.get(
  "/:id",
  authorizeMinimum("CALL_OPERATOR"),
  controller.getDepartment,
);

router.post(
  "/",
  authorizeMinimum("ADMIN"),
  validate(createDepartmentSchema),
  controller.createDepartment,
);

router.patch(
  "/:id",
  authorizeMinimum("DEPARTMENT_HEAD"),
  validate(updateDepartmentSchema),
  controller.updateDepartment,
);

router.delete(
  "/:id",
  authorizeMinimum("ADMIN"),
  controller.deleteDepartment,
);

export default router;
