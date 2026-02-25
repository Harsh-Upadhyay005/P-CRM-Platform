import crypto from "crypto";
import path from "path";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { supabase, BUCKET } from "../config/supabase.js";
import { getComplaint } from "./complaints.service.js";

const getStoragePath = (complaintId, originalName) => {
  const uniqueSuffix = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(originalName).toLowerCase();
  return `complaints/${complaintId}/${Date.now()}-${uniqueSuffix}${ext}`;
};

const extractStoragePath = (fileUrl) => {
  const marker = `/object/public/${BUCKET}/`;
  const idx = fileUrl.indexOf(marker);
  return idx !== -1 ? fileUrl.slice(idx + marker.length) : null;
};

export const uploadAttachments = async (complaintId, files, user) => {
  await getComplaint(complaintId, user);

  if (!files || files.length === 0) {
    throw new ApiError(400, "No files provided");
  }

  if (!supabase) {
    throw new ApiError(503, "File storage is not configured");
  }

  const uploaded = [];

  for (const file of files) {
    const storagePath = getStoragePath(complaintId, file.originalname);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, {
        contentType:  file.mimetype,
        upsert:       false,
      });

    if (error) {
      throw new ApiError(500, `Failed to upload "${file.originalname}": ${error.message}`);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    uploaded.push({
      complaintId,
      uploadedById: user.userId,
      fileName:     file.originalname,
      fileSize:     file.size,
      mimeType:     file.mimetype,
      fileUrl:      data.publicUrl,
    });
  }

  await prisma.complaintAttachment.createMany({ data: uploaded });

  return uploaded.map(({ fileName, fileSize, mimeType, fileUrl }) => ({
    fileName,
    fileSize,
    mimeType,
    url: fileUrl,
  }));
};

export const listAttachments = async (complaintId, user) => {
  await getComplaint(complaintId, user);

  return prisma.complaintAttachment.findMany({
    where:   { complaintId },
    orderBy: { createdAt: "desc" },
    select: {
      id:        true,
      fileName:  true,
      fileSize:  true,
      mimeType:  true,
      fileUrl:   true,
      createdAt: true,
    },
  });
};

export const deleteAttachment = async (complaintId, attachmentId, user) => {
  await getComplaint(complaintId, user);

  const attachment = await prisma.complaintAttachment.findFirst({
    where: { id: attachmentId, complaintId },
  });

  if (!attachment) throw new ApiError(404, "Attachment not found");

  if (supabase) {
    const storagePath = extractStoragePath(attachment.fileUrl);
    if (storagePath) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
    }
  }

  await prisma.complaintAttachment.delete({ where: { id: attachmentId } });
};
