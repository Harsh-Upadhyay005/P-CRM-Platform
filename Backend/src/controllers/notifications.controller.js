import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as service from "../services/notification.service.js";
import { addClient, removeClient } from "../services/sse.service.js";

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

/**
 * GET /api/v1/notifications/stream
 *
 * Opens a persistent SSE connection. The client receives:
 *   event: connected  — sent once on open with the current unread count
 *   event: notification — pushed whenever a new notification is created for this user
 *   event: ping       — sent every 30 s as a keep-alive heartbeat
 *
 * NOTE: Not wrapped in asyncHandler — the response intentionally stays open.
 */
export const streamNotifications = (req, res) => {
  // Required SSE response headers
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection",    "keep-alive");
  // Disable proxy / nginx buffering so events reach the browser immediately
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const { userId } = req.user;

  addClient(userId, res);

  // Send initial state so the client can update its badge without a second request
  service.getUnreadCount(req.user)
    .then(({ unreadCount }) => {
      res.write(`event: connected\ndata: ${JSON.stringify({ unreadCount })}\n\n`);
    })
    .catch(() => {
      res.write(`event: connected\ndata: ${JSON.stringify({ unreadCount: 0 })}\n\n`);
    });

  // Clean up when browser closes the connection / navigates away
  req.on("close", () => {
    removeClient(userId, res);
  });
};
