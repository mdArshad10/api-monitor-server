import { config } from "dotenv";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import expressLimit from "express-rate-limit";
import { errorMiddleware } from "./shared/middlewears/error.js";
import { ApiResponse } from "./shared/utils/apiResponse.js";
import { logger } from "./shared/config/logger.js";
import authRoute from "./services/auth/routes/auth.route.js";
import clientRoute from "./services/client/routes/clientRoute.js";

config({
  path: "./.env",
});
const app = express();

const limit = expressLimit({});

app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(helmet());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    allowedHeaders: ["Authorization", "Content-type:application/json"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);
app.use(cookieParser());
app.use(limit);
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  next();
});

app.get("/", (_req, res, _next) => {
  res.status(200).json(
    ApiResponse.success(
      {
        service: "API Hit Monitoring System",
        version: "1.0.0",
        endpoints: {
          health: "/health",
          auth: "/api/auth",
          ingest: "/api/hit",
          analytics: "/api/analytics",
        },
      },
      200,
      "Api Hit Monitoring Services",
    ),
  );
});
app.get("/health", (_req, res, _next) => {
  res.status(200).json(ApiResponse.success({}, 200, "Service is healthy"));
});

app.use('/api/auth',authRoute)
app.use('/api',clientRoute)

app.use(errorMiddleware);
app.use((_req, res, _next) => {
  res.status(404).json(ApiResponse.error(null, 404, "Endpoint not found"));
});

export { app };
