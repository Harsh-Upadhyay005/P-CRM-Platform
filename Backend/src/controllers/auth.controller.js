import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as authService from "../services/auth.service.js";

export const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.body);
  res.status(201).json(new ApiResponse(201, user, "Registration successful. Please verify your email."));
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  res.json(new ApiResponse(200, null, "Email verified"));
});

export const login = asyncHandler(async (req, res) => {
  const tokens = await authService.loginUser(req.body);
  res.json(new ApiResponse(200, tokens, "Login successful"));
});

export const refresh = asyncHandler(async (req, res) => {
  const tokens = await authService.refreshTokens(req.body.token);
  res.json(new ApiResponse(200, tokens, "Token refreshed"));
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.body.token);
  res.json(new ApiResponse(200, null, "Logged out successfully"));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.json(new ApiResponse(200, null, "If email exists, reset link sent"));
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.json(new ApiResponse(200, null, "Password reset successful"));
});
