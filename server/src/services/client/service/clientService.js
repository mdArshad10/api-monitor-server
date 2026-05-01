import { APPLICATION_ROLES } from "../../../shared/config/const.js";
import { logger } from "../../../shared/config/logger.js";
import { AppError } from "../../../shared/utils/AppError.js";
import { Snowflake } from "@sapphire/snowflake";
import { v4 as uuidv4 } from "uuid";

class ClientService {
  constructor(dependencies) {
    if (!dependencies) {
      logger.error("Dependencies is not initialized");
      throw new Error("Dependencies is not initialized");
    }
    if (!dependencies.clientRepository) {
      logger.error("Client repository is not initialized");
      throw new Error("Client repository is not initialized");
    }
    if (!dependencies.apiKeyRepository) {
      logger.error("Api key repository is not initialized");
      throw new Error("Api key repository is not initialized");
    }
    if (!dependencies.userRepository) {
      logger.error("User repository is not initialized");
      throw new Error("User repository is not initialized");
    }
    this.clientRepository = dependencies.clientRepository;
    this.apiKeyRepository = dependencies.apiKeyRepository;
    this.userRepository = dependencies.userRepository;
  }

  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  async createClient(clientData, adminData) {
    try {
      const { name, email, website, description } = clientData;
      const slug = this.generateSlug(name);
      const slugExist = await this.clientRepository.findBySlug(slug);
      if (slugExist) {
        throw new AppError(`Client with slug ${slug} already exists`, 400);
      }
      const client = await this.clientRepository.create({
        name,
        email,
        website,
        description,
        slug,
        createdBy: adminData.userId,
      });
      console.log(client);

      logger.info("Client created successfully", {
        slug: client.slug,
      });
      return client;
    } catch (error) {
      logger.error("Error in creating client", error);
      throw error;
    }
  }

  canAccessUser(adminData, clientId) {
    if (adminData.role === APPLICATION_ROLES.SUPER_ADMIN) {
      return true;
    }
    return (
      adminData.clientId &&
      adminData.clientId.toString() === clientId.toString()
    );
  }

  async createUser(userData, adminData, clientId) {
    try {
      const isClientExit = await this.clientRepository.findById(clientId);
      if (!isClientExit) {
        throw new AppError("Client not found", 404);
      }
      if (!this.canAccessUser(adminData, clientId)) {
        throw new AppError("You are not authorized to create user", 403);
      }

      const { username, email, password, role } = userData;
      const user = await this.userRepository.create({
        username,
        email,
        password,
        role,
        createdBy: adminData.userId,
        clientId,
      });
      logger.info("User created successfully", {
        mongoId: user._id,
        email: user.email,
      });
      return user;
    } catch (error) {
      logger.error("Error in creating user", error);
      throw error;
    }
  }

  generateApiKeyValue() {
    // Define a custom epoch
    const epoch = new Date("2000-01-01T00:00:00.000Z");

    // Create an instance of Snowflake
    const snowflake = new Snowflake(epoch);
    const uniqueId = snowflake.generate();
    const prefix = "api";
    return `${prefix}_${uniqueId}`;
  }

  async createApiKey(clientId, apiKeyData, userData) {
    try {
      const isClientExit = await this.clientRepository.findById(clientId);
      if (!isClientExit) {
        throw new AppError("Client not found", 404);
      }
      if (!this.canAccessUser(userData, clientId)) {
        throw new AppError("You are not authorized to create API key", 403);
      }

      if (
        ![APPLICATION_ROLES.SUPER_ADMIN, APPLICATION_ROLES.ADMIN].includes(
          userData.role,
        )
      ) {
        throw new AppError(
          "Access Denied - only super admin and client admin can create api key",
          403,
        );
      }

      const keyId = uuidv4();
      const keyValue = this.generateApiKeyValue();

      const apiKey = await this.apiKeyRepository.create({
        clientId,
        keyId,
        apiValue: keyValue,
        createdBy: userData.userId,
        ...apiKeyData,
      });
      logger.info("API key created successfully", {
        mongoId: apiKey._id,
        clientId,
      });
      return apiKey;
    } catch (error) {
      logger.error("Error in creating API key", error);
      throw error;
    }
  }

  async getAllClientApiKey(clientId, userData) {
    try {
      const isClientExit = await this.clientRepository.findById(clientId);
      if (!isClientExit) {
        throw new AppError("Client not found", 404);
      }
      if (!this.canAccessUser(userData, clientId)) {
        throw new AppError("You are not authorized to get API keys", 403);
      }
      const apiKeys = await this.apiKeyRepository.findByClientId(
        clientId,
        {},
        {},
      );
      logger.info("API keys fetched successfully", {
        mongoId: apiKeys._id,
        clientId,
      });
      return apiKeys;
    } catch (error) {
      logger.error("Error in fetching API keys", error);
      throw error;
    }
  }

  async getApiKey(clientId, apiKeyId, userData) {
    try {
      const isClientExit = await this.clientRepository.findById(clientId);
      if (!isClientExit) {
        throw new AppError("Client not found", 404);
      }
      if (!this.canAccessUser(userData, clientId)) {
        throw new AppError("You are not authorized to get API key", 403);
      }
      const apiKey = await this.apiKeyRepository.findById(apiKeyId);
      if (!apiKey) {
        throw new AppError("API key not found", 404);
      }
      logger.info("API key fetched successfully", {
        mongoId: apiKey._id,
        clientId,
      });
      return apiKey;
    } catch (error) {
      logger.error("Error in fetching API key", error);
      throw error;
    }
  }

  async getClientByApiKey(apiValue) {
    try {
      const apiKey = await this.apiKeyRepository.findByApiValue(apiValue);
      if (!apiKey) {
        throw new AppError("API key not found", 404);
      }

      if (apiKey.isExpired()) {
        return null;
      }

      const client = apiKey.clientId;

      logger.info("Client fetched successfully", {
        mongoId: client._id,
        clientId: client.clientId,
      });
      return {
        client,
        key: apiKey,
      };
    } catch (error) {
      logger.error("Error in fetching client", error);
      throw error;
    }
  }
}

export { ClientService };
