import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorize, authorizeMinimum } from "../middlewares/role.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { apiWriteLimiter } from "../middlewares/rateLimiters.js";
import * as controller from "../controllers/complaints.controller.js";
import * as attachmentController from "../controllers/attachment.controller.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";
import {
  createComplaintSchema,
  updateComplaintSchema,
  assignComplaintSchema,
  updateStatusSchema,
  addNoteSchema,
  publicCreateComplaintSchema,
  feedbackSchema,
} from "../validators/complaints.validators.js";

const router = express.Router();

// ── PUBLIC (no auth) ──────────────────────────────────────────────────────
router.get("/track/:trackingId", controller.trackComplaint);

// Tenant search + department lookup for the public submit form
router.get("/public/tenants",                   controller.searchPublicTenants);
router.get("/public/tenant/:slug/departments",  controller.getPublicDepartments);

router.post(
  "/public",
  apiWriteLimiter,
  validate(publicCreateComplaintSchema),
  controller.createPublicComplaint,
);

// Public file upload - no auth required
router.post(
  "/public/:trackingId/attachments",
  apiWriteLimiter,
  uploadMiddleware.array("files", 5),
  attachmentController.uploadPublicAttachments,
);

// ── AUTHENTICATED ─────────────────────────────────────────────────────────
router.use(authMiddleware);

router.use((req, res, next) => {
  if (["POST", "PATCH", "DELETE"].includes(req.method)) return apiWriteLimiter(req, res, next);
  next();
});

router.post(
  "/",
  authorizeMinimum("CALL_OPERATOR"),
  validate(createComplaintSchema),
  controller.createComplaint,
);

// Citizens can only view their own complaints (filed via public portal)
// Officers and above can view complaints based on their role-based access
router.get(
  "/",
  authorizeMinimum("CITIZEN"),
  controller.listComplaints,
);

router.get(
  "/export",
  authorizeMinimum("DEPARTMENT_HEAD"),
  controller.exportComplaints,
);

router.get(
  "/:id",
  authorizeMinimum("CITIZEN"),
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

router.get(
  "/:id/feedback",
  authorizeMinimum("OFFICER"),
  controller.getFeedback,
);

router.post(
  "/:id/feedback",
  authorizeMinimum("CALL_OPERATOR"),
  validate(feedbackSchema),
  controller.submitFeedback,
);

router.post(
  "/:id/attachments",
  authorizeMinimum("CALL_OPERATOR"),
  uploadMiddleware.array("files", 5),
  attachmentController.uploadAttachments,
);

router.get(
  "/:id/attachments",
  authorizeMinimum("CITIZEN"),
  attachmentController.listAttachments,
);

router.delete(
  "/:id/attachments/:attachmentId",
  authorizeMinimum("ADMIN"),
  attachmentController.deleteAttachment,
);

export default router;
