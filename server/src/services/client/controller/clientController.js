import { logger } from "../../../shared/config/logger.js";
import { ApiResponse } from "../../../shared/utils/apiResponse.js";

class ClientController {
  constructor(clientService, authService) {
    if (!clientService) {
      logger.error("Client service is not initialized");
      throw new Error("Client service is not initialized");
    }
    if (!authService) {
      logger.error("Auth service is not initialized");
      throw new Error("Auth service is not initialized");
    }
    this.clientService = clientService;
    this.authService = authService;
  }

  async createClient(req, res, next) {
    try {
      const isAdmin = await this.authService.checkSuperAdminPermission(
        req.user.userId,
      );
      if (!isAdmin) {
        throw new AppError("Unauthorized", 401);
      }
      const clientData = req.body;
      const client = await this.clientService.createClient(
        clientData,
        req.user,
      );
      res
        .status(201)
        .json(ApiResponse.success(client, 201, "Client created successfully"));
    } catch (error) {
      next(error);
    }
  }

  async createClientUser(req, res, next) {
    try {
      const { clientId } = req.params;
      const userData = req.body;
      const user = await this.clientService.createUser(
        userData,
        req.user,
        clientId,
      );
      res
        .status(201)
        .json(ApiResponse.success(user, 201, "User created successfully"));
    } catch (error) {
      next(error);
    }
  }

  async createClientApiKey(req, res, next) {
    try {
      const { clientId } = req.params;
      const apiKeyData = req.body;
      const apiKey = await this.clientService.createApiKey(
        clientId,
        apiKeyData,
        req.user,
      );
      res
        .status(201)
        .json(ApiResponse.success(apiKey, 201, "API key created successfully"));
    } catch (error) {
      next(error);
    }
  }

  async getAllClientApiKey(req, res, next) {
    try {
      const { clientId } = req.params;
      const apiKeys = await this.clientService.getAllClientApiKey(
        clientId,
        req.user,
      );
      res
        .status(200)
        .json(
          ApiResponse.success(apiKeys, 200, "API keys fetched successfully"),
        );
    } catch (error) {
      next(error);
    }
  }

  async getApiKey(req, res, next) {
    try {
      const { clientId, apiKeyId } = req.params;
      const apiKey = await this.clientService.getApiKey(
        clientId,
        apiKeyId,
        req.user,
      );
      res
        .status(200)
        .json(ApiResponse.success(apiKey, 200, "API key fetched successfully"));
    } catch (error) {
      next(error);
    }
  }
}

export { ClientController };
