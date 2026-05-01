import { BaseApiKeyRepository } from "./baseApiKeyRepository.js";
import { logger } from "../../../shared/config/logger.js";
import { ApiKey } from "../../../shared/models/apiKey.model.js";

class MongoApiKeyRepository extends BaseApiKeyRepository {
  constructor() {
    super(ApiKey);
  }

  async create(data) {
    try {
      const apiKey = new this.model(data);
      await apiKey.save();
      logger.info("API Key created successfully", {
        apiKey: apiKey._id,
        clientId: apiKey.clientId,
      });
      return apiKey;
    } catch (error) {
      logger.error("Error in creating API Key", error);
      throw error;
    }
  }

  async findByApiKeyValue(KeyValue, includeInactive) {
    try {
      const apiKey = await this.model.findOne({ keyValue, includeInactive });
      logger.info("API Key found successfully", {
        apiKey: apiKey._id,
        clientId: apiKey.clientId,
      });
      return apiKey;
    } catch (error) {
      logger.error("Error in finding API Key", error);
      throw error;
    }
  }

  async findByClientId(clientId, filter = {}, option) {
    try {
      const query = { clientId, ...filter };
      const { limit = 50, skip = 0, sort = { createdAt: -1 } } = option;

      const apiKeys = await this.model
        .find(query)
        .populate("createdBy", "username email")
        .sort(sort)
        .skip(skip)
        .limit(limit);
      logger.info("API Keys found successfully", {
        apiKeys: apiKeys.map((apiKey) => apiKey._id),
        clientId: clientId,
      });
      return apiKeys;
    } catch (error) {
      logger.error("Error in finding API Keys", error);
      throw error;
    }
  }

  async countByClientId(clientId, filter) {
    try {
      const query = { clientId, ...filter };
      const count = await this.model.countDocuments(query);
      logger.info("API Keys count successfully", {
        count,
        clientId: clientId,
      });
      return count;
    } catch (error) {
      logger.error("Error in counting API Keys", error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const apiKey = await this.model.findById(id);
      if (!apiKey) {
        throw new Error(`ApiKey not found with id: ${id}`);
      }
      logger.info("API Key found successfully", {
        apiKey: apiKey._id,
        clientId: apiKey.clientId,
      });
      return apiKey;
    } catch (error) {
      logger.error("Error in finding API Key", error);
      throw error;
    }
  }

  async findByApiKeyValue(apiValue, includeInactive = false) {
    try {
      const filter = {
        apiValue,
      };
      if (!includeInactive) {
        filter.isActive = true;
      }
      const apiKey = await this.model.findOne(filter).populate("clientId");
      if (!apiKey) {
        throw new Error(`ApiKey not found with value: ${apiValue}`);
      }
      logger.info("API Key found successfully", {
        apiKey: apiKey._id,
        clientId: apiKey.clientId,
      });
      return apiKey;
    } catch (error) {
      logger.error("Error in finding API Key", error);
      throw error;
    }
  }
}

export { MongoApiKeyRepository };
