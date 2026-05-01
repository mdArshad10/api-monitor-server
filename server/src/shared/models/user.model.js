import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { SecurityUtils } from "../utils/SecurityUtils.js";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true,
      minLength: 3,
      trim: true,
      validate: {
        validator: function (userName) {
          return /^[a-zA-Z0-9_.-]+$/.test(userName);
        },
        message: "Please enter a valid username",
      },
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: "Please enter a valid email",
      },
    },
    password: {
      type: String,
      required: true,
      minLength: 6,
      maxLength: 50,
      validate: {
        validator: function (password) {
          if (
            this.isModified("password") &&
            password &&
            !password.startsWith(`$2a$`)
          ) {
            const validation = SecurityUtils.validatePassword(password);
            return validation.success;
          }
          return true;
        },
        message: function (props) {
          if (props.password && !props.password.startsWith(`$2a$`)) {
            const validation = SecurityUtils.validatePassword(props.password);
            return validation.errors.join(". ");
          }
          return "Password validation failed";
        },
      },
    },
    role: {
      type: String,
      enum: ["super_admin", "client_admin", "client_viewer"],
      default: "client_viewer",
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: function () {
        return this.role !== "super_admin";
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    permissions: {
      canCreateApiKeys: {
        type: Boolean,
        default: false,
      },
      canManageUsers: {
        type: Boolean,
        default: false,
      },
      canViewAnalytics: {
        type: Boolean,
        default: true,
      },
      canExportData: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true, collection: "users" },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return;
  } catch (error) {
    throw new Error(error);
  }
});

userSchema.index({ clientId: 1, isActive: 1 });
userSchema.index({ role: 1 });

export const User = mongoose.model("User", userSchema);
