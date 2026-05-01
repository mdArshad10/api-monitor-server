import config from "../../../shared/config/index.js";
import { APPLICATION_ROLES } from "../../../shared/config/const.js";
import { logger } from "../../../shared/config/logger.js";
import { ApiResponse } from "../../../shared/utils/apiResponse.js";

class AuthController {
  constructor(userService) {
    if (!userService) {
      throw new Error("userServices is required");
    }
    this.services = userService;
  }

  async onBoardSuperAdmin(req, res, next) {
    try {
      const { email, password, username } = req.body;
      const userData = {
        email,
        password,
        username,
        role: APPLICATION_ROLES.SUPER_ADMIN,
      };
      const { token, user } = await this.services.onBoardSuperAdmin(userData);
      res
        .cookie("access_token", token, {
          httpOnly: config.cookie.httpOnly,
          secure: config.cookie.secure,
          maxAge: config.cookie.maxAge,
        })
        .json(
          ApiResponse.success(user, 201, "super admin on board successfully"),
        );
    } catch (error) {
      logger.error("get error in onBoard of super admin", error);
      next(error);
    }
  }

  async register(req, res, next) {
    try {
      const {
        email,
        password,
        username,
        role = APPLICATION_ROLES.CLIENT_VIEWER,
      } = req.body;
      const userData = {
        email,
        password,
        username,
        role,
        clientId: req.user.userId,
      };
      logger.info("user data", userData);
      const { token, user } = await this.services.register(userData);
      logger.info("user registered successfully", {
        username: user.username,
      });
      res
        .cookie("access_token", token, {
          httpOnly: config.cookie.httpOnly,
          secure: config.cookie.secure,
          maxAge: config.cookie.maxAge,
        })
        .json(ApiResponse.success(user, 201, "user registered successfully"));
    } catch (error) {
      logger.error("get error in register", error);
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, token } = await this.services.login(email, password);
      res
        .cookie("access_token", token, {
          httpOnly: config.cookie.httpOnly,
          secure: config.cookie.secure,
          maxAge: config.cookie.maxAge,
        })
        .json(ApiResponse.success(user, 200, "login successfully"));
    } catch (error) {
      logger.error("get error in login", error);
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await this.services.getProfile(req.user.userId);
      res.json(ApiResponse.success(user, 200, "get profile successfully"));
    } catch (error) {
      logger.error("get error in getProfile", error);
      next(error);
    }
  }

  logout(req, res, next) {
    try {
      res
        .clearCookie("access_token", {
          httpOnly: config.cookie.httpOnly,
          secure: config.cookie.secure,
        })
        .json(ApiResponse.success({}, 200, "logout successfully"));
    } catch (error) {
      logger.error("get error in logout", error);
      next(error);
    }
  }
}

export { AuthController };
