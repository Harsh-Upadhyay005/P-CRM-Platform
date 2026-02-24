import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as service from "../services/notification.service.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const data = await service.getUserNotifications(req.user, req.query);
  res.json(new ApiResponse(200, data, "Notifications retrieved"));
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const data = await service.getUnreadCount(req.user);
  res.json(new ApiResponse(200, data, "Unread count retrieved"));
});

export const markRead = asyncHandler(async (req, res) => {
  const data = await service.markNotificationRead(req.params.id, req.user);
  res.json(new ApiResponse(200, data, "Notification marked as read"));
});

export const markAllRead = asyncHandler(async (req, res) => {
  const data = await service.markAllNotificationsRead(req.user);
  res.json(new ApiResponse(200, data, "All notifications marked as read"));
});
