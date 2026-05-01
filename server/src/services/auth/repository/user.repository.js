import { logger } from "../../../shared/config/logger.js";
import { User } from "../../../shared/models/user.model.js";
import baseRepository from "./base.repository.js";

class MongoUserRepository extends baseRepository {
  constructor() {
    super(User);
  }

  async create(userData) {
    try {
      const data = { ...userData };
      if (userData.role == "super_admin" && !userData.permissions) {
        data.permissions = {
          canCreateApiKey: true,
          canManageUsers: true,
          canViewAnalysis: true,
          canExploreData: true,
        };
      }
      const user = new this.model(data);
      await user.save();
      logger.info("User Created", { username: user.username });
      return user;
    } catch (error) {
      logger.error("Error Create User", error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const user = await this.model.findById(id);
      return user;
    } catch (error) {
      logger.error("Error finding user by Id", error);
      throw error;
    }
  }

  async findByEmail(email) {
    try {
      const user = await this.model.findOne({ email });
      return user;
    } catch (error) {
      logger.error("Error finding user by Id", error);
      throw error;
    }
  }

  async findByUsername(username) {
    try {
      const user = await this.model.findByOne({ username });
      return user;
    } catch (error) {
      logger.error("Error finding user by Id", error);
      throw error;
    }
  }

  async findAll() {
    try {
      const users = await this.model
        .find({ isActive: true })
        .select("-password");
      logger.info("get all user");
      return users;
    } catch (error) {
      logger.error("get error in find all", error);
      throw error;
    }
  }
}

export { MongoUserRepository };
