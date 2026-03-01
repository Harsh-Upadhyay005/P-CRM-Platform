import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import * as authService from "../services/auth.service.js";
import { env } from "../config/env.js";
import { parseDurationToMs, verifyAccessToken } from "../utils/token.utils.js";

const IS_PROD = env.NODE_ENV === "production";


const baseCookieOpts = {
  httpOnly: true,
  secure:   IS_PROD,
  // SameSite=None is required for cross-origin cookies (Vercel frontend → Render backend).
  // In development both origins are localhost so Lax is fine and Secure is not required.
  sameSite: IS_PROD ? "none" : "lax",
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
    throw new ApiError(401, "Refresh token missing");
  }
  const { accessToken, refreshToken } = await authService.refreshTokens(token);
  setAuthCookies(res, accessToken, refreshToken);
  res.json(new ApiResponse(200, null, "Token refreshed"));
});

export const logout = asyncHandler(async (req, res) => {
  const rawAccessToken  = req.cookies?.accessToken;
  const refreshToken    = req.cookies?.refreshToken;

  // Try to decode the access token to get userId + jti for blacklisting
  // (don't throw — the token may be expired or absent)
  let decoded = null;
  if (rawAccessToken) {
    try {
      decoded = verifyAccessToken(rawAccessToken);
    } catch {
      // expired or invalid — still allow logout; just skip blacklisting
    }
  }

  if (refreshToken && decoded?.userId) {
    await authService.logoutUser(refreshToken, decoded.userId, decoded.jti ?? null, decoded.exp ?? null);
  } else if (refreshToken) {
    // Best-effort: purge the refresh token row by its hash even without a verified user
    await authService.revokeRefreshToken(refreshToken).catch(() => {});
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
