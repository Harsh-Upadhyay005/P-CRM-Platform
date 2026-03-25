import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { blacklistToken } from "../config/redis.js";
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
import { isValidStateCode } from "../constants/stateCodes.js";

const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getSuperAdminScope = async (userId) => {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isActive: true,
      isDeleted: true,
      isPlatformOwner: true,
      managedStateCode: true,
      role: { select: { type: true } },
    },
  });

  if (!actor || actor.isDeleted || !actor.isActive) {
    throw new ApiError(403, "Actor account is inactive");
  }
  if (actor.role?.type !== "SUPER_ADMIN") {
    throw new ApiError(403, "Only SUPER_ADMIN can perform this action");
  }

  return actor;
};

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
    where: { type: "CITIZEN" },
  });

  if (!role) {
    throw new ApiError(500, "Default role not configured");
  }

  const hashedPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const shouldAutoVerify = !env.BREVO_API_KEY || env.BREVO_API_KEY.includes("your_brevo");
  const { rawToken, hashedToken } = generateEmailVerificationToken();

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      tenantId: tenant.id,
      roleId: role.id,
      verificationToken: shouldAutoVerify ? null : hashedToken,
      verificationExpiry: shouldAutoVerify ? null : getExpiryTime(env.EMAIL_VERIFICATION_EXPIRY_MINUTES),
      emailVerified: shouldAutoVerify,
    },
  });

  if (!shouldAutoVerify) {
    try {
      await sendVerificationEmail(email, name, rawToken);
    } catch {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      throw new ApiError(
        500,
        "Failed to send verification email. Please try again.",
      );
    }
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
    include: { role: true, tenant: true },
  });

  if (!user) {
    throw new ApiError(400, "Invalid credentials");
  }

  if (!user.isActive || user.isDeleted) {
    throw new ApiError(403, "Account inactive");
  }

  if (user.tenantId && !user.tenant?.isActive) {
    throw new ApiError(403, "This office is currently inactive");
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

  // Link anonymous complaints to this user based on matching email (case-insensitive)
  const anonymousComplaints = await prisma.complaint.findMany({
    where: {
      citizenEmail: {
        equals: email,
        mode: 'insensitive',
      },
      createdById: null,
      tenantId: user.tenantId,
    },
    select: { id: true },
  });

  if (anonymousComplaints.length > 0) {
    await prisma.complaint.updateMany({
      where: {
        id: { in: anonymousComplaints.map(c => c.id) },
      },
      data: {
        createdById: user.id,
      },
    });
  }

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
    include: { user: { include: { role: true, tenant: true } } },
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

  const { user: refreshUser } = storedToken;
  if (!refreshUser.isActive || refreshUser.isDeleted) {
    await prisma.refreshToken
      .delete({ where: { id: storedToken.id } })
      .catch(() => {});
    throw new ApiError(401, "Account is inactive");
  }

  if (refreshUser.tenantId && !refreshUser.tenant?.isActive) {
    await prisma.refreshToken
      .delete({ where: { id: storedToken.id } })
      .catch(() => {});
    throw new ApiError(401, "Tenant is inactive");
  }

  const newRawRefreshToken = generateRefreshToken();
  const newAccessToken = generateAccessToken(refreshUser);

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: storedToken.id } }),
    prisma.refreshToken.create({
      data: {
        userId: refreshUser.id,
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

// Purge a refresh token by hash alone (no userId required — used during expired-token logout)
export const revokeRefreshToken = async (token) => {
  const hashedToken = hashRefreshToken(token);
  await prisma.refreshToken.deleteMany({ where: { token: hashedToken } });
};

export const logoutUser = async (token, userId, jti, exp) => {
  const hashedToken = hashRefreshToken(token);

  await prisma.refreshToken.deleteMany({
    where: { token: hashedToken, userId },
  });

  if (jti && exp) {
    const ttlSeconds = exp - Math.floor(Date.now() / 1000);
    await blacklistToken(jti, ttlSeconds);
  }

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

  try {
    await sendResetPasswordEmail(email, user.name, rawToken);
  } catch {
    // Email failure is non-fatal: clear saved token so the stale hash
    // doesn't block a future attempt, then swallow the error (anti-enumeration).
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: null, resetTokenExpiry: null },
    }).catch(() => {});
  }

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

export const generateSuperAdminSignupCode = async ({ stateCode, expiresInDays = 30 }, user) => {
  const actor = await getSuperAdminScope(user.userId);
  if (!actor.isPlatformOwner) {
    throw new ApiError(403, "Only platform owner can generate super admin signup codes");
  }

  const normalizedStateCode = String(stateCode).trim().toUpperCase();
  if (!isValidStateCode(normalizedStateCode)) {
    throw new ApiError(400, "Invalid state code");
  }

  const randomPart = crypto.randomBytes(6).toString("hex").toUpperCase();
  const code = `${normalizedStateCode}_SIGNUP_${randomPart}`;
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const created = await prisma.superAdminSignupCode.create({
    data: {
      code,
      stateCode: normalizedStateCode,
      createdById: actor.id,
      expiresAt,
    },
    select: {
      id: true,
      code: true,
      stateCode: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return created;
};

export const signupSuperAdminWithCode = async ({ name, email, password, signupCode }) => {
  const emailErr = validateEmailDomain(email);
  if (emailErr) throw new ApiError(400, emailErr);

  const passwordErr = validatePassword(password);
  if (passwordErr) throw new ApiError(400, passwordErr);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new ApiError(400, "Email already registered");

  const codeRecord = await prisma.superAdminSignupCode.findUnique({
    where: { code: String(signupCode).trim().toUpperCase() },
    select: {
      id: true,
      stateCode: true,
      expiresAt: true,
      consumedAt: true,
      isActive: true,
    },
  });

  if (!codeRecord || !codeRecord.isActive || codeRecord.consumedAt) {
    throw new ApiError(400, "Invalid or already used signup code");
  }
  if (codeRecord.expiresAt <= new Date()) {
    throw new ApiError(400, "Signup code has expired");
  }

  const superAdminRole = await prisma.role.findUnique({
    where: { type: "SUPER_ADMIN" },
    select: { id: true },
  });
  if (!superAdminRole) {
    throw new ApiError(500, "SUPER_ADMIN role is not configured");
  }

  const hashedPassword = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const result = await prisma.$transaction(async (tx) => {
    const freshCode = await tx.superAdminSignupCode.findUnique({
      where: { id: codeRecord.id },
      select: { id: true, consumedAt: true, isActive: true, expiresAt: true, stateCode: true },
    });

    if (!freshCode || !freshCode.isActive || freshCode.consumedAt || freshCode.expiresAt <= new Date()) {
      throw new ApiError(400, "Invalid or expired signup code");
    }

    const newUser = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: superAdminRole.id,
        managedStateCode: freshCode.stateCode,
        isPlatformOwner: false,
        emailVerified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        managedStateCode: true,
        isPlatformOwner: true,
        role: { select: { id: true, type: true } },
      },
    });

    await tx.superAdminSignupCode.update({
      where: { id: freshCode.id },
      data: {
        consumedAt: new Date(),
        isActive: false,
        consumedById: newUser.id,
      },
    });

    return newUser;
  });

  return result;
};
