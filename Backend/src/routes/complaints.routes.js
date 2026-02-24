import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorize, authorizeMinimum } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import * as controller from "../controllers/complaints.controller.js";
import {
  createComplaintSchema,
  updateComplaintSchema,
  assignComplaintSchema,
  updateStatusSchema,
  addNoteSchema,
} from "../validators/complaints.validators.js";

const router = express.Router();

router.get("/track/:trackingId", controller.trackComplaint);

router.use(authMiddleware);

router.post(
  "/",
  authorizeMinimum("CALL_OPERATOR"),
  validate(createComplaintSchema),
  controller.createComplaint,
);

router.get(
  "/",
  authorizeMinimum("CALL_OPERATOR"),
  controller.listComplaints,
);

router.get(
  "/:id",
  authorizeMinimum("CALL_OPERATOR"),
  controller.getComplaint,
);

router.patch(
  "/:id",
  authorizeMinimum("ADMIN"),
  validate(updateComplaintSchema),
  controller.updateComplaint,
);

router.patch(
  "/:id/assign",
  authorizeMinimum("DEPARTMENT_HEAD"),
  validate(assignComplaintSchema),
  controller.assignComplaint,
);

router.patch(
  "/:id/status",
  authorizeMinimum("OFFICER"),
  validate(updateStatusSchema),
  controller.updateComplaintStatus,
);

router.delete(
  "/:id",
  authorizeMinimum("ADMIN"),
  controller.deleteComplaint,
);

router.post(
  "/:id/notes",
  authorizeMinimum("OFFICER"),
  validate(addNoteSchema),
  controller.addNote,
);

router.get(
  "/:id/notes",
  authorizeMinimum("OFFICER"),
  controller.getNotes,
);

export default router;
