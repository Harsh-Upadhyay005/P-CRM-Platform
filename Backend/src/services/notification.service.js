import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, paginatedResponse } from "../utils/helpers.js";

const createNotifications = async (records) => {
  if (!records || records.length === 0) return;
  await prisma.notification.createMany({ data: records, skipDuplicates: true });
};

export const notifyAssignment = async (complaintId, assignedToId, actorId, trackingId) => {
  if (!assignedToId || assignedToId === actorId) return;

  await createNotifications([
    {
      userId:      assignedToId,
      complaintId,
      title:       "Complaint Assigned to You",
      message:     `Complaint ${trackingId} has been assigned to you. Please review and take action.`,
      isRead:      false,
    },
  ]);
};

export const notifyStatusChange = async (
  complaintId,
  oldStatus,
  newStatus,
  createdById,
  assignedToId,
  actorId,
  trackingId
) => {
  const message = `Complaint ${trackingId} status changed from ${oldStatus} to ${newStatus}.`;

  const recipientSet = new Set(
    [createdById, assignedToId].filter((id) => id && id !== actorId)
  );

  const records = [...recipientSet].map((userId) => ({
    userId,
    complaintId,
    title:   `Complaint Status Updated — ${newStatus}`,
    message,
    isRead:  false,
  }));

  await createNotifications(records);
};

export const getUserNotifications = async (user, query = {}) => {
  const { page, limit, skip } = getPagination(query);

  const where = { userId: user.userId };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy:  { createdAt: "desc" },
      skip,
      take:     limit,
      select: {
        id:         true,
        title:      true,
        message:    true,
        isRead:     true,
        createdAt:  true,
        complaintId: true,
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return paginatedResponse(notifications, total, page, limit);
};

export const markNotificationRead = async (notificationId, user) => {
  const notification = await prisma.notification.findUnique({
    where:  { id: notificationId },
    select: { id: true, userId: true },
  });

  if (!notification || notification.userId !== user.userId) {
    throw new ApiError(404, "Notification not found");
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data:  { isRead: true },
    select: { id: true, isRead: true },
  });
};

export const markAllNotificationsRead = async (user) => {
  const result = await prisma.notification.updateMany({
    where: { userId: user.userId, isRead: false },
    data:  { isRead: true },
  });
  return { updatedCount: result.count };
};

export const getUnreadCount = async (user) => {
  const count = await prisma.notification.count({
    where: { userId: user.userId, isRead: false },
  });
  return { unreadCount: count };
};
