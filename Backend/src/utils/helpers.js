import crypto from "crypto";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const generateTrackingId = () => {
  const today = new Date();
  const datePart = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("");
  const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `PCRM-${datePart}-${randomPart}`;
};

export const getPagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT),
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const paginatedResponse = (data, total, page, limit) => ({
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  },
});

export const slugify = (text) =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const sanitizeUser = (user) => {
  if (!user || typeof user !== "object") {
    throw new TypeError("sanitizeUser expects a user object");
  }
  const {
    password,
    verificationToken,
    verificationExpiry,
    resetToken,
    resetTokenExpiry,
    ...safeUser
  } = user;
  return safeUser;
};
