export class SecurityUtils {
  static PASSWORD_REQUIREMENT = {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "6"),
    requireUpperCase:
      (process.env.PASSWORD_REQUIRE_UPPERCASE || "true") === "true",
    requireLowerCase:
      (process.env.PASSWORD_REQUIRE_LOWERCASE || "true") === "true",
    requireNumbers: (process.env.PASSWORD_REQUIRE_NUMBERS || "true") === "true",
    requireSymbols: (process.env.PASSWORD_REQUIRE_SYMBOLS || "true") === "true",
  };

  static validatePassword(password) {
    const errors = [];
    const requirements = this.PASSWORD_REQUIREMENT;

    if (!password) {
      return {
        success: false,
        errors: ["password is required"],
      };
    }
    if (password.length < requirements.minLength) {
      errors.push(
        `Password must be at least ${requirements.minLength} chars long!`,
      );
    }
    if (requirements.requireUpperCase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (requirements.requireLowerCase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (requirements.requireNumbers && !/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (requirements.requireSymbols && !/[^A-Za-z0-9]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    const weakPasswords = [
      "password",
      "123456",
      "qwerty",
      "admin",
      "letmein",
      "password123",
      "admin123",
      "12345678",
      "welcome",
    ];

    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push("Password is too common and easily guessable");
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }
}
