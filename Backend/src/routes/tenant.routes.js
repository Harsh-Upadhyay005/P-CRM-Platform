import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeMinimum } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createTenantSchema, updateTenantSchema } from "../validators/tenant.validators.js";
import * as controller from "../controllers/tenant.controller.js";

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeMinimum("SUPER_ADMIN"));

router.get("/",          controller.listTenants);
router.post("/",         validate(createTenantSchema), controller.createTenant);
router.get("/:id",       controller.getTenant);
router.patch("/:id",     validate(updateTenantSchema), controller.updateTenant);
router.delete("/:id",    controller.deactivateTenant);

export default router;
