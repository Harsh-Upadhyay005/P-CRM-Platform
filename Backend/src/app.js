import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";

import { ApiResponse } from "./utils/ApiResponse.js";
import { ApiError } from "./utils/ApiError.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import { env } from "./config/env.js";
import authRoute from "./routes/auth.routes.js";
import complaintsRoute from "./routes/complaints.routes.js";
import usersRoute from "./routes/users.routes.js";
import departmentsRoute from "./routes/departments.routes.js";
import analyticsRoute from "./routes/analytics.routes.js";
import notificationsRoute from "./routes/notifications.routes.js";
import auditLogRoute from "./routes/auditLog.routes.js";

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = [
  env.NODE_ENV === "development" && "http://localhost:3000",
  env.FRONTEND_URL,
].filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy:     false,
  }),
);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials:    true,
    methods:        ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge:         600,
  }),
);

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             150,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    statusCode: 429,
    success:    false,
    data:       null,
    message:    "Too many requests. Please slow down and try again later.",
  },
});

app.use("/api", globalLimiter);

app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, { status: "OK" }, "Server is healthy"));
});

app.use("/api/v1/auth",          authRoute);
app.use("/api/v1/complaints",    complaintsRoute);
app.use("/api/v1/users",         usersRoute);
app.use("/api/v1/departments",   departmentsRoute);
app.use("/api/v1/analytics",     analyticsRoute);
app.use("/api/v1/notifications", notificationsRoute);
app.use("/api/v1/audit-logs",    auditLogRoute);

app.use((req, res, next) => {
  next(new ApiError(404, "Route not found"));
});

app.use(errorMiddleware);

export default app;