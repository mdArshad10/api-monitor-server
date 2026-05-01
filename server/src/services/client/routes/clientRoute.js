import { Router } from "express";
import container from "../dependencies/index.js";
import { authenticate } from "../../../shared/middlewears/auth.middlewear.js";
import { onBoardClientSchema } from "../validation/clientSchema.js";
import { validate } from "../../../shared/middlewears/validate.js";

const router = Router();
const { clientController } = container.controllers;

router.use(authenticate);

// onbard a new client
router
  .route("/admin/clients/onbard")
  .post(validate(onBoardClientSchema),(req, res, next) => clientController.createClient(req, res, next));

// create a user for client
router
  .route("/admin/clients/:clientId/users")
  .post((req, res, next) => clientController.createClientUser(req, res, next));

// create Api Key for a client
router
  .route("/admin/clients/:clientId/api-keys")
  .post((req, res, next) => clientController.createClientApiKey(req, res, next))
  .get((req, res, next) => clientController.getAllClientApiKey(req, res, next));

// get a single API key for a client
router
  .route("/admin/clients/:clientId/api-keys/:apiKeyId")
  .get((req, res, next) => clientController.getApiKey(req, res, next));

export default router;
