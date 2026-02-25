import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as attachmentService from "../services/attachment.service.js";

export const uploadAttachments = asyncHandler(async (req, res) => {
  const data = await attachmentService.uploadAttachments(
    req.params.id,
    req.files,
    req.user,
  );
  res.status(201).json(new ApiResponse(201, data, "Files uploaded successfully"));
});

export const listAttachments = asyncHandler(async (req, res) => {
  const data = await attachmentService.listAttachments(req.params.id, req.user);
  res.json(new ApiResponse(200, data, "Attachments retrieved"));
});

export const deleteAttachment = asyncHandler(async (req, res) => {
  await attachmentService.deleteAttachment(
    req.params.id,
    req.params.attachmentId,
    req.user,
  );
  res.json(new ApiResponse(200, null, "Attachment deleted"));
});
