import { Prisma } from "../../generated/prisma/index.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const errorMiddleware = (err, req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  } else {
    console.error(`[${new Date().toISOString()}] ${err.name}: ${err.message}`);
  }

  if (err instanceof ApiError) {
    return res
      .status(err.statusCode)
      .json(new ApiResponse(err.statusCode, null, err.message, err.errors?.length ? err.errors : undefined));
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const field = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : "field";
      return res
        .status(409)
        .json(new ApiResponse(409, null, `A record with this ${field} already exists`));
    }
    if (err.code === "P2025") {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Record not found"));
    }
    if (err.code === "P2003") {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid reference: related record does not exist"));
    }
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "Invalid or expired token"));
  }

  return res
    .status(500)
    .json(new ApiResponse(500, null, "Internal Server Error"));
};

export default errorMiddleware;
