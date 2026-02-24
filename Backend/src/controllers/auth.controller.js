import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import * as authService from "../services/auth.service.js";
import { env } from "../config/env.js";
import { parseDurationToMs } from "../utils/token.utils.js";

const IS_PROD = env.NODE_ENV === "production";


const baseCookieOpts = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax",
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    ...baseCookieOpts,
    maxAge: parseDurationToMs(env.ACCESS_TOKEN_EXPIRY),
  });
  res.cookie("refreshToken", refreshToken, {
    ...baseCookieOpts,
    maxAge: parseDurationToMs(env.REFRESH_TOKEN_EXPIRY),
    path: "/api/v1/auth",
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie("accessToken", { ...baseCookieOpts });
  res.clearCookie("refreshToken", { ...baseCookieOpts, path: "/api/v1/auth" });
};

export const register = asyncHandler(async (req, res) => {
  const user = await authService.registerUser(req.body);
  res
    .status(201)
    .json(new ApiResponse(201, user, "Registration successful. Please verify your email."));
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  res.json(new ApiResponse(200, null, "Email verified successfully"));
});

export const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerificationEmail(req.body.email);
  res.json(
    new ApiResponse(200, null, "If your email is unverified, a new verification link has been sent."),
  );
});

export const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await authService.loginUser(req.body);
  setAuthCookies(res, accessToken, refreshToken);
  res.json(new ApiResponse(200, { user }, "Login successful"));
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "Refresh token missing"));
  }
  const { accessToken, refreshToken } = await authService.refreshTokens(token);
  setAuthCookies(res, accessToken, refreshToken);
  res.json(new ApiResponse(200, null, "Token refreshed"));
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await authService.logoutUser(token, req.user.userId);
  }
  clearAuthCookies(res);
  res.json(new ApiResponse(200, null, "Logged out successfully"));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  res.json(new ApiResponse(200, null, "If email exists, a reset link has been sent"));
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  clearAuthCookies(res);
  res.json(new ApiResponse(200, null, "Password reset successful"));
});
