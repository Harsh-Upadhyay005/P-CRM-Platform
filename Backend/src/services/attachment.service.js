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

export const uploadPublicAttachments = async (trackingId, files) => {
  const complaint = await prisma.complaint.findFirst({
    where: { trackingId },
    select: {
      id: true,
      tenantId: true,
      createdById: true,
    },
  });

  if (!complaint) {
    throw new ApiError(404, "Complaint not found");
  }

  if (!files || files.length === 0) {
    throw new ApiError(400, "No files provided");
  }

  if (!supabase) {
    throw new ApiError(503, "File storage is not configured");
  }

  let uploadedById = complaint.createdById;
  if (!uploadedById) {
    const fallbackUploader = await prisma.user.findFirst({
      where: {
        tenantId: complaint.tenantId,
        isDeleted: false,
        isActive: true,
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (!fallbackUploader) {
      throw new ApiError(
        503,
        "No active tenant user available to record attachment upload",
      );
    }

    uploadedById = fallbackUploader.id;
  }

  const uploaded = [];

  for (const file of files) {
    const storagePath = getStoragePath(complaint.id, file.originalname);

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
      complaintId: complaint.id,
      uploadedById,
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

  const complaintMeta = await prisma.complaint.findUnique({
    where: { id: complaintId },
    select: { createdById: true },
  });

  const attachments = await prisma.complaintAttachment.findMany({
    where:   { complaintId },
    orderBy: { createdAt: "desc" },
    select: {
      id:        true,
      uploadedById: true,
      fileName:  true,
      fileSize:  true,
      mimeType:  true,
      fileUrl:   true,
      createdAt: true,
    },
  });

  const uploaderIds = Array.from(
    new Set(attachments.map((attachment) => attachment.uploadedById).filter(Boolean)),
  );

  const uploaders =
    uploaderIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: uploaderIds } },
          select: {
            id: true,
            name: true,
            role: { select: { type: true } },
          },
        })
      : [];

  const uploaderMap = new Map(uploaders.map((u) => [u.id, u]));

  const toResponse = (attachment, url) => {
    const uploader = uploaderMap.get(attachment.uploadedById);
    const uploaderType =
      uploader?.role?.type === "CITIZEN" ||
      (!uploader && complaintMeta?.createdById === attachment.uploadedById)
        ? "CITIZEN"
        : "OFFICER";

    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      url,
      createdAt: attachment.createdAt,
      uploadedBy: uploader
        ? { id: uploader.id, name: uploader.name }
        : null,
      uploadedByType: uploaderType,
    };
  };

  // When Supabase is available, replace permanent public URLs with 1-hour signed URLs
  // so attachment files are not permanently accessible to anyone who finds the link.
  if (!supabase) {
    return attachments.map((attachment) =>
      toResponse(attachment, attachment.fileUrl),
    );
  }

  return Promise.all(
    attachments.map(async (attachment) => {
      const storagePath = extractStoragePath(attachment.fileUrl);
      if (!storagePath) {
        return toResponse(attachment, attachment.fileUrl);
      }

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 3600);

      return toResponse(attachment, error ? attachment.fileUrl : data.signedUrl);
    }),
  );
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
