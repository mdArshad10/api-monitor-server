import { ApiResponse } from "../utils/apiResponse.js";

export const validate = (schema) => (req, res, next) => {
  if (!schema) return next();

  const body = req.body || {};
  const errors = [];

  Object.entries(schema).forEach(([field, rules]) => {
    const value = body[field];

    if (
      rules.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push(`${field} is required`);
      return;
    }

    if (
      rules.minlength &&
      typeof value === "string" &&
      value.length < rules.minlength
    ) {
      errors.push(`${field} must be at least ${rules.minLength} characters`);
    }
    if (rules.custom && typeof rules.custom === "function") {
      const customErr = rules.custom(value, body);
      if (customErr){ 
        errors.push(customErr)
      };
    }
  });
  if (errors.length > 0) {
    return res
      .status(400)
      .json(ApiResponse.error("Validation failed", 400, errors));
  }
  next();
};
