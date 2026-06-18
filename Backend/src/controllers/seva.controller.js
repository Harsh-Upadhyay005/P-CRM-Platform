import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import * as sevaService from '../services/seva.service.js';
import crypto from 'crypto';

/**
 * POST /api/seva/chat
 * Process user message and return response
 */
export const chat = asyncHandler(async (req, res) => {
  const { sessionId, message, coordinates } = req.body;
  
  if (!message || typeof message !== 'string') {
    throw new ApiError(400, 'Message is required');
  }
  
  const finalSessionId = sessionId || crypto.randomUUID();
  const userId = req.user?.id || null;
  const tenantId = req.user?.tenantId || null;
  
  const result = await sevaService.processMessage(
    finalSessionId,
    message,
    userId,
    tenantId,
    req.user ?? null,
    coordinates || null,
  );
  
  res.json(new ApiResponse(200, result, 'Message processed'));
});
