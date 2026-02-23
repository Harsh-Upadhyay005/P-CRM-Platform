import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  if (err instanceof ApiError) {
    return res
      .status(err.statusCode)
      .json(new ApiResponse(err.statusCode, null, err.message));
  }

  return res
    .status(500)
    .json(new ApiResponse(500, null, "Internal Server Error"));
};

export default errorMiddleware;
