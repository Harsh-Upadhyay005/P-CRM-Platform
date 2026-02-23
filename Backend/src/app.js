import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { ApiResponse } from "./utils/ApiResponse.js";
import { ApiError } from "./utils/ApiError.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import { env } from "./config/env.js";
import authRoute from "./routes/auth.routes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  env.NODE_ENV === "production" ? env.FRONTEND_URL : null,
].filter(Boolean);

// SECURITY
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
  }),
);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// RATE LIMITER
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use("/api", limiter);

// LOGGER
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// HEALTH CHECK
app.get("/health", (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, { status: "OK" }, "Server is healthy"));
});

// ROUTES
app.use("/api/v1/auth", authRoute);

// 404 HANDLER
app.use((req, res, next) => {
  next(new ApiError(404, "Route not found"));
});

// GLOBAL ERROR HANDLER
app.use(errorMiddleware);

export default app;
