import { ApiError } from "../utils/ApiError.js";
import { isHigherOrEqual, ROLE_RANK } from "../utils/roleHierarchy.js";

const assertAuthenticated = (req) => {
  if (!req.user || !req.user.role) {
    throw new ApiError(
      401,
      "Authentication required — place authenticate() before role middleware",
    );
  }
  if (!(req.user.role in ROLE_RANK)) {
    throw new ApiError(403, "Unrecognised role — please log in again");
  }
};

export const authorize = (...allowedRoles) => {
  if (allowedRoles.length === 0) {
    throw new Error("authorize() requires at least one role argument");
  }
  for (const r of allowedRoles) {
    if (!(r in ROLE_RANK)) {
      throw new Error(
        `authorize(): unknown role "${r}". Valid roles: ${Object.keys(ROLE_RANK).join(", ")}`,
      );
    }
  }
  return (req, _res, next) => {
    assertAuthenticated(req);
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access restricted to: ${allowedRoles.join(", ")}`,
      );
    }
    next();
  };
};

export const authorizeMinimum = (minimumRole) => {
  if (!(minimumRole in ROLE_RANK)) {
    throw new Error(
      `authorizeMinimum(): unknown role "${minimumRole}". Valid roles: ${Object.keys(ROLE_RANK).join(", ")}`,
    );
  }
  return (req, _res, next) => {
    assertAuthenticated(req);
    if (!isHigherOrEqual(req.user.role, minimumRole)) {
      throw new ApiError(
        403,
        `This action requires at least the ${minimumRole} role`,
      );
    }
    next();
  };
};

export const authorizeRoles = authorize;
