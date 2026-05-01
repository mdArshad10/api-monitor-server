import { logger } from "../config/logger.js";
import { ApiResponse } from "../utils/apiResponse.js";

export const errorMiddleware = (err, req, res, next) => {
  let message = err.message || "Internal Server Error";
  let statusCode = err.statusCode || 500;
  let errors = err.error || null;

  logger.error("Error Occurred", {
    message: err.message,
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    errors = Object.values(err.errors).map((e) => e.message);
  } else if (err.name === "MongoServerError" && err.code === 11000) {
    statusCode = 409;
    message = "Duplicate key error";
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  res.status(statusCode).json(ApiResponse.error(errors, statusCode, message));
};
