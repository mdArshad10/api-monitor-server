import { isValidRole } from "../../../shared/config/const.js";

export const onBoardSuperAdminSchema = {
  username: {
    required: true,
  },
  password: {
    required: true,
    minLength: 6,
  },
  email: {
    required: true,
  },
};

export const registerSchema = {
  username: {
    required: true,
  },
  email: {
    required: true,
  },
  password: {
    required: true,
    minLength: 6,
  },
  role: {
    required: true,
    custom: (value) => {
      if (!value) return null;
      return isValidRole(value) ? null : "Invalid role";
    },
  },
};

export const loginSchema = {
  email: {
    required: true,
  },
  password: {
    required: true,
    minLength: 6,
  },
};
