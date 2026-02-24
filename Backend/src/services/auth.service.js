import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generateResetPasswordToken,
  getExpiryTime,
  parseDurationToDate,
} from "../utils/token.utils.js";
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
} from "./email.service.js";
import { env } from "../config/env.js";
import { validatePassword, validateEmailDomain } from "../utils/validators.js";

const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const registerUser = async ({ name, email, password, tenantSlug }) => {
  const emailErr = validateEmailDomain(email);
  if (emailErr) throw new ApiError(400, emailErr);

  const passwordErr = validatePassword(password);
  if (passwordErr) throw new ApiError(400, passwordErr);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(400, "Email already registered");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant) {
    throw new ApiError(404, "Tenant not found");
  }

  if (!tenant.isActive) {
    throw new ApiError(403, "Tenant is inactive");
  }

  const role = await prisma.role.findUnique({
    where: { type: "CALL_OPERATOR" },
  });

  if (!role) {
    throw new ApiError(500, "Default role not configured");
  }

  const hashedPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const { rawToken, hashedToken } = generateEmailVerificationToken();

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      tenantId: tenant.id,
      roleId: role.id,
      verificationToken: hashedToken,
      verificationExpiry: getExpiryTime(env.EMAIL_VERIFICATION_EXPIRY_MINUTES),
    },
  });

  try {
    await sendVerificationEmail(email, name, rawToken);
  } catch {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    throw new ApiError(
      500,
      "Failed to send verification email. Please try again.",
    );
  }

  const {
    password: _pw,
    verificationToken,
    verificationExpiry,
    resetToken,
    resetTokenExpiry,
    ...safeUser
  } = user;
  return safeUser;
};

export const verifyEmail = async (token) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      verificationToken: hashedToken,
      verificationExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationExpiry: null,
    },
  });

  return true;
};

export const resendVerificationEmail = async (email) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return true;
  if (user.emailVerified) return true;
  if (!user.isActive || user.isDeleted) return true;

  const { rawToken, hashedToken } = generateEmailVerificationToken();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationToken: hashedToken,
      verificationExpiry: getExpiryTime(env.EMAIL_VERIFICATION_EXPIRY_MINUTES),
    },
  });

  try {
    await sendVerificationEmail(email, user.name, rawToken);
  } catch {
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: null, verificationExpiry: null },
    }).catch(() => {});
    throw new ApiError(500, "Failed to send verification email. Please try again.");
  }

  return true;
};

export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user) {
    throw new ApiError(400, "Invalid credentials");
  }

  if (!user.isActive || user.isDeleted) {
    throw new ApiError(403, "Account inactive");
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    throw new ApiError(400, "Invalid credentials");
  }

  if (!user.emailVerified) {
    throw new ApiError(403, "Email not verified");
  }

  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: hashRefreshToken(rawRefreshToken),
      expiresAt: parseDurationToDate(env.REFRESH_TOKEN_EXPIRY),
    },
  });

  const {
    password: _pw,
    verificationToken,
    verificationExpiry,
    resetToken,
    resetTokenExpiry,
    ...safeUser
  } = user;

  return { accessToken, refreshToken: rawRefreshToken, user: safeUser };
};

export const refreshTokens = async (token) => {
  const hashedIncoming = hashRefreshToken(token);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: hashedIncoming },
    include: { user: { include: { role: true } } },
  });

  if (!storedToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (storedToken.expiresAt < new Date()) {
    await prisma.refreshToken
      .delete({ where: { id: storedToken.id } })
      .catch(() => {});
    throw new ApiError(401, "Refresh token expired");
  }

  const newRawRefreshToken = generateRefreshToken();
  const newAccessToken = generateAccessToken(storedToken.user);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: storedToken.id } }),
    prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        token: hashRefreshToken(newRawRefreshToken),
        expiresAt: parseDurationToDate(env.REFRESH_TOKEN_EXPIRY),
      },
    }),
  ]);

  return {
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
  };
};

export const logoutUser = async (token, userId) => {
  const hashedToken = hashRefreshToken(token);

  await prisma.refreshToken.deleteMany({
    where: { token: hashedToken, userId },
  });

  return true;
};

export const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return true;

  const { rawToken, hashedToken } = generateResetPasswordToken();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashedToken,
      resetTokenExpiry: getExpiryTime(env.RESET_PASSWORD_EXPIRY_MINUTES),
    },
  });

  await sendResetPasswordEmail(email, user.name, rawToken);

  return true;
};

export const resetPassword = async (token, newPassword) => {
  const passwordErr = validatePassword(newPassword);
  if (passwordErr) throw new ApiError(400, passwordErr);

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const hashedPassword = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  await prisma.refreshToken.deleteMany({
    where: { userId: user.id },
  });

  return true;
};
