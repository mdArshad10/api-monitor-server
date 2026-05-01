import config from "../config/index.js";
import { logger } from "../config/logger.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

export const authenticate = async (req, res, next) => {
  try {
    const token =
      req.headers?.authorization?.split(" ")[1] || req.cookies?.access_token;

    if (!token) {
      res
        .status(401)
        .json(ApiResponse.error(null, 401, "Authentication token is required"));
    }
    const decode = jwt.verify(token, config.jwt.secret);
    if (!decode) {
      res.status(401).json(ApiResponse.error(null, 404, "Invalid token"));
    }
    logger.info("get the authenticated user");
    req.user = decode;
    next();
  } catch (error) {
    logger.error("Authentication Failed", {
      error: error.message,
      path: req.path,
    });
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json(ApiResponse.error(error, 404, "Token expire"));
    }
    return res.status(401).json(ApiResponse.error(error, 401, "Invalid Token"));
  }
};
