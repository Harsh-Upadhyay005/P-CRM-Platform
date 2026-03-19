import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeMinimum } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import * as controller from "../controllers/workflow.controller.js";
import {
  workflowSettingSchema,
  createAssignmentRuleSchema,
  updateAssignmentRuleSchema,
  upsertCategorySlaSchema,
} from "../validators/workflow.validators.js";

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeMinimum("ADMIN"));

router.get("/settings", controller.getWorkflowSettings);
router.patch("/settings", validate(workflowSettingSchema), controller.updateWorkflowSettings);

router.get("/assignment-rules", controller.listAssignmentRules);
router.post("/assignment-rules", validate(createAssignmentRuleSchema), controller.createAssignmentRule);
router.patch("/assignment-rules/:id", validate(updateAssignmentRuleSchema), controller.updateAssignmentRule);
router.delete("/assignment-rules/:id", controller.deleteAssignmentRule);

router.get("/category-sla", controller.listCategorySlaPolicies);
router.post("/category-sla", validate(upsertCategorySlaSchema), controller.upsertCategorySlaPolicy);
router.delete("/category-sla/:id", controller.deleteCategorySlaPolicy);

export default router;
