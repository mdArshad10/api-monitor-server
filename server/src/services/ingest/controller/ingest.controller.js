import { logger } from "../../../shared/config/logger.js";
import { ApiResponse } from "../../../shared/utils/api-response.js";

class IngestController {
  constructor({ ingestService }) {
    if (!ingestService) {
      throw new Error("IngestController is requires ingest service");
    }
    this.ingestService = ingestService;
  }

  async ingestHit(req, res, _next) {
    try {
      logger.info("[IngestController] client data received", {
        clientId: req.client._id,
        clientName: req.client.name,
        clientKeys: Object.keys(req.client),
      });
      const hitData = {
        ...req.body,
        clientId: req.client._id,
        apiKeyId: req.apiKey._id,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"] || "",
      };
      const result = await this.ingestService.ingestHit(hitData);
      res
        .status(202)
        .json(ApiResponse.success("Hit queued for processing", result));
    } catch (error) {
      res
        .status(500)
        .json(ApiResponse.error("Failed to queue hit", error.message));
    }
  }
}

export { IngestController };
