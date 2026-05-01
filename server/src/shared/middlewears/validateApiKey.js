import { logger } from "../config/logger.js";
import { ApiResponse } from "../utils/apiResponse.js";
import clientContainer from "../../services/client/dependencies/index.js";

export const validateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
      logger.warn("API request without Api Key", {
        path: req.path,
        ip: req.ip,
      });
      return res
        .status(401)
        .json(ApiResponse.error(null, 401, "API Key is required"));
    }
    const result =
      await clientContainer.services.clientService.getClientByApiKey(apiKey);
    if (!result) {
      logger.warn("Invalid API key attempted", {
        path: req.path,
        ip: req.ip,
        apiKey: apiKey.substring(0, 8) + "...", // Log partial key for security
      });
      return res
        .status(403)
        .json(ApiResponse.error(null, 403, "Invalid API key"));
    }

    const { client, key } = result;

    if (!client.isActive) {
      logger.warn("Inactive client attempted", {
        path: req.path,
        ip: req.ip,
        apiKey: apiKey.substring(0, 8) + "...", // Log partial key for security
      });
      return res
        .status(403)
        .json(ApiResponse.error(null, 403, "Inactive client"));
    }

    if (!key.permissions?.canIngest) {
      logger.warn("API key without ingest permission attempted access", {
        path: req.path,
        ip: req.ip,
        apiKeyId: key._id,
      });
      return res
        .status(403)
        .json(
          ApiResponse.error(
            null,
            403,
            "API key does not have ingest permissions",
          ),
        );
    }

    req.client = client;
    req.apiKey = key;
    next();
  } catch (error) {
    logger.error("Error in validating API key", error);
    return res
      .status(500)
      .json(ApiResponse.error(null, 500, "Internal server error"));
  }
};
