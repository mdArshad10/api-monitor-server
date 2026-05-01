import express from "express";
import dependencies from "../dependencies/index.js";
import { validate } from "../../../shared/middlewears/validate.js";
import {
  loginSchema,
  onBoardSuperAdminSchema,
  registerSchema,
} from "../validation/authSchema.js";
import { authenticate } from "../../../shared/middlewears/auth.middlewear.js";
import { authorize } from "../../../shared/middlewears/authorization.js";
import { APPLICATION_ROLES } from "../../../shared/config/const.js";
import { requestLogger } from "../../../shared/middlewears/requestLogger.js";

const router = express.Router();
const { controllers } = dependencies;
const authController = controllers.userController;

router.use(requestLogger);
router
  .route("/on-board-super-admin")
  .post(validate(onBoardSuperAdminSchema), (req, res, next) =>
    authController.onBoardSuperAdmin(req, res, next),
  );

router
  .route("/login")
  .post(validate(loginSchema), (req, res, next) =>
    authController.login(req, res, next),
  );

router
  .route("/register")
  .post(
    authenticate,
    authorize([APPLICATION_ROLES.SUPER_ADMIN]),
    validate(registerSchema),
    (req, res, next) => authController.register(req, res, next),
  );

router
  .route("/profile")
  .get(authenticate, (req, res, next) =>
    authController.getProfile(req, res, next),
  );

router
  .route("/logout")
  .get(authenticate, (req, res, next) => authController.logout(req, res, next));


export default router;
