import { ApiResponse } from "../utils/apiResponse.js";

export const authorize =
  (allowedRoles = []) =>
  (req, res, next) => {
    try {
      if (!req.user.role) {
        return res.status(403).json(ApiResponse.error(null, 403, "Forbidden"));
      }
      if (allowedRoles.length === 0) {
        next();
      }
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json(ApiResponse.error(null, 403, "Forbidden"));
      }
      next();
    } catch (error) {
      res.status(403).json(ApiResponse.error(null, 403, "Forbidden"));
    }
  };
