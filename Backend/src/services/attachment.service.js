import fs from "fs";
import path from "path";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { getComplaint } from "./complaints.service.js";

export const uploadAttachments = async (complaintId, files, user) => {
  await getComplaint(complaintId, user);

  if (!files || files.length === 0) {
    throw new ApiError(400, "No files provided");
  }

  const records = files.map((f) => ({
    complaintId,
    uploadedById: user.userId,
    fileName:    f.originalname,
    fileSize:    f.size,
    mimeType:    f.mimetype,
    storagePath: f.path.replace(/\\/g, "/"),
  }));

  await prisma.complaintAttachment.createMany({ data: records });

  return records.map((r) => ({
    fileName:    r.fileName,
    fileSize:    r.fileSize,
    mimeType:    r.mimeType,
    url:         `/${r.storagePath}`,
  }));
};

export const listAttachments = async (complaintId, user) => {
  await getComplaint(complaintId, user);

  return prisma.complaintAttachment.findMany({
    where:   { complaintId },
    orderBy: { createdAt: "desc" },
    select: {
      id:          true,
      fileName:    true,
      fileSize:    true,
      mimeType:    true,
      storagePath: true,
      createdAt:   true,
    },
  });
};

export const deleteAttachment = async (complaintId, attachmentId, user) => {
  await getComplaint(complaintId, user);

  const attachment = await prisma.complaintAttachment.findFirst({
    where: { id: attachmentId, complaintId },
  });

  if (!attachment) throw new ApiError(404, "Attachment not found");

  await prisma.complaintAttachment.delete({ where: { id: attachmentId } });

  fs.unlink(path.resolve(attachment.storagePath), () => {});
};
