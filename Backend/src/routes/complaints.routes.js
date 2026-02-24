import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorize, authorizeMinimum } from "../middlewares/role.middleware.js";
import * as controller from "../controllers/complaints.controller.js";

const router = express.Router();

router.get("/track/:trackingId", controller.trackComplaint);

router.use(authMiddleware);

router.post(
  "/",
  authorizeMinimum("CALL_OPERATOR"),
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
  controller.updateComplaint,
);

router.patch(
  "/:id/assign",
  authorizeMinimum("DEPARTMENT_HEAD"),
  controller.assignComplaint,
);

router.patch(
  "/:id/status",
  authorizeMinimum("OFFICER"),
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
  controller.addNote,
);

router.get(
  "/:id/notes",
  authorizeMinimum("OFFICER"),
  controller.getNotes,
);

export default router;
