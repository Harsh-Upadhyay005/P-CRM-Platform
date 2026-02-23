import { ApiError } from "../utils/ApiError.js";

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "Forbidden");
    }
    next();
  };
};