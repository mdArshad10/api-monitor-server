import config from "../../../shared/config/index.js";
import { APPLICATION_ROLES } from "../../../shared/config/const.js";
import { logger } from "../../../shared/config/logger.js";
import { AppError } from "../../../shared/utils/AppError.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

class AuthService {
  constructor(userRepository) {
    if (!userRepository) {
      throw new Error("UserRepository is required");
    }
    this.userRepository = userRepository;
    logger.info(this.userRepository);
  }

  generateToken(user) {
    const payload = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      clientId: user?.clientId,
    };
    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
    return token;
  }

  formateUserForResponse(user) {
    const userObject = user.toObject ? user.toObject() : { ...user };
    delete userObject.password;
    return userObject;
  }

  async onBoardSuperAdmin(userData) {
    const existingUser = await this.userRepository.findAll();
    if (existingUser && existingUser.length > 0) {
      throw new AppError("super admin onboarding disable", 403);
    }
    const user = await this.userRepository.create(userData);
    const token = this.generateToken(user);
    logger.info("super admin onboard successfully", {
      username: user.username,
    });
    return {
      user: this.formateUserForResponse(user),
      token,
    };
  }

  async register(userData) {
    try {
      const user = await this.userRepository.create(userData);
      const token = this.generateToken(user);
      logger.info("admin onboard successfully", {
        username: user.username,
      });
      return {
        user: this.formateUserForResponse(user),
        token,
      };
    } catch (error) {
      throw error;
    }
  }

  async login(email, password) {
    try {
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        throw new AppError("user not found", 404);
      }
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      if (!isPasswordMatch) {
        throw new AppError("password not match", 401);
      }
      const token = this.generateToken(user);
      logger.info("login successfully", {
        username: user.username,
      });

      return {
        user: this.formateUserForResponse(user),
        token,
      };
    } catch (error) {
      throw error;
    }
  }

  async getProfile(userId) {
    try {
      const user = await this.userRepository.findById(userId);
      return this.formateUserForResponse(user);
    } catch (error) {
      throw error;
    }
  }

  async checkSuperAdminPermission(userId) {
    try {
      const user = await this.userRepository.findById(userId);
      return user.role === APPLICATION_ROLES.SUPER_ADMIN;
    } catch (error) {
      throw error;
    }
  }
}

export { AuthService };
