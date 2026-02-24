import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";

const formatZodErrors = (error) =>
  error.errors.map((e) => ({
    field:   e.path.join(".") || "root",
    message: e.message,
  }));

export const validate = (schema, source = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return next(new ApiError(422, errors[0].message, errors));
    }
    req[source] = result.data;
    return next();
  };
