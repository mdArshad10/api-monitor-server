import { Router } from "express";
import { validateApiKey } from "../../../shared/middlewears/validateApiKey.js";
import rateLimit from "express-rate-limit";
import Container from "../dependencies/index.js";

const { ingestController } = Container.controllers;
const router = Router();

// Rate limiter for the ingest endpoint to prevent abuse and ensure fair usage. The limiter is configured with a window of time and a maximum number of requests allowed within that window. If the limit is exceeded, a 429 Too Many Requests response is sent back to the client with a message indicating that they should try again later. This helps to protect the server from being overwhelmed by too many requests in a short period of time, while still allowing legitimate traffic to be processed.
const ingestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/", validateApiKey, ingestLimiter, (req, res, next) =>
  ingestController.ingestHit(req, res, next),
);

export default router;
