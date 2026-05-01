import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    keyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    apiValue: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 100,
    },
    environment: {
      type: String,
      enum: ["development", "staging", "production"],
      default: "development",
    },
    description: {
      type: String,
      maxlength: 500,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    permissions: {
      canIngest: {
        type: Boolean,
        default: true,
      },
      canReadAnalysis: {
        type: Boolean,
        default: false,
      },
      allowedServices: [
        {
          type: String,
          trim: true,
        },
      ],
    },
    security: {
      allowedIPs: [
        {
          type: String,
          validate: {
            validator: function (v) {
              return (
                /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(v) ||
                v === "0.0.0.0/0"
              );
            },
            message: "Invalid IP address format",
          },
        },
      ],
      allowedOrigins: [
        {
          type: String,
          validate: {
            validator: function (v) {
              return /^https?:\/\/[^\s]+$/.test(v) || v === "*";
            },
            message: "Invalid origin format",
          },
        },
      ],
      lastRotated: {
        type: Date,
        default: Date.now,
      },
      rotationWarningDays: {
        type: Number,
        default: 30,
      },
    },
    expireAt: {
      type: Date,
      default: () => {
        const days = parseInt(process.env.API_KEY_EXPIRY_DAYS || "365");
        return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      },
      index: true,
    },
    meta: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      tags: [
        {
          type: String,
          trim: true,
          maxlength: 50,
        },
      ],
      purpose: {
        type: String,
        trim: true,
        maxlength: 200,
      },
    },
  },
  { timestamps: true, collection: "apiKeys" },
);

export const ApiKey = mongoose.model("ApiKey", apiKeySchema);
