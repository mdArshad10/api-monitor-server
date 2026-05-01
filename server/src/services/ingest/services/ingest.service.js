import { AppError } from "../../../shared/utils/AppError.js";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../../../shared/config/logger.js";

class IngestService {
  constructor({ eventProducer }) {
    if (!eventProducer) {
      throw new Error("Event producer is required");
    }
    this.eventProducer = eventProducer;
  }

  validateHitData(hitData) {
    const requiredField = [
      "ServiceName",
      "endpoint",
      "method",
      "statusCode",
      "latencyMs",
      "clientId",
    ];

    const filterField = requiredField.filter((field) => !hitData[field]);
    if (filterField.length > 0) {
      throw new AppError(`Missing required fields: ${filterField.join(", ")}`);
    }

    const validateMethods = [
      "GET",
      "POST",
      "PATCH",
      "PUT",
      "DELETE",
      "OPTIONS",
      "HEAD",
    ];
    if (!validateMethods.includes(hitData.method.toUpperCase())) {
      throw new AppError(`Invalid method: ${hitData.method}`, 400);
    }

    const statusCode = parseInt(hitData.statusCode, 10);
    if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
      throw new AppError(`Invalid status code: ${hitData.statusCode}`, 400);
    }

    const latency = parseFloat(hitData.latencyMs);
    if (isNaN(latency) || latency < 0) {
      throw new AppError(`Invalid latency: ${hitData.latencyMs}`, 400);
    }
  }

  async ingestHit(hitData) {
    try {
      this.validateHitData(hitData);
      const event = {
        eventId: uuidv4(),
        timeStamp: new Date().toISOString(),
        serviceName: hitData.ServiceName,
        endpoint: hitData.endpoint,
        method: hitData.method.toUpperCase(),
        statusCode: parseInt(hitData.statusCode, 10),
        latencyMs: parseFloat(hitData.latencyMs),
        clientId: hitData.clientId,
        apiKeyId: hitData.apiKeyId,
        ip: hitData.ip || "UNKNOW",
        userAgent: hitData.userAgent || "",
      };

      await this.eventProducer.publishApiHits(event);
      logger.info(`[IngestService] Event published successfully`, {
        eventId: event.eventId,
      });
      return {
        success: true,
        eventId: event.eventId,
        status: "queued",
        timeStamp: event.timeStamp,
      };
    } catch (error) {
      logger.error(`[IngestService] Failed to publish event`, {
        error: error.message,
      });
      throw error;
    }
  }
}

export { IngestService };
