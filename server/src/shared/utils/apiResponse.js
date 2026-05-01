class ApiResponse {
  static success(data = null, statusCode = 200, message = "Success") {
    return {
      success: true,
      data,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    };
  }

  static error(error = null, statusCode = 400, message = "Error") {
    return {
      success: false,
      message,
      statusCode,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  static validationError(error = null) {
    return {
      success: false,
      message: "Validation Failed",
      error,
      statusCode: 400,
      timestamp: new Date().toISOString(),
    };
  }

  static paginated(data = null, page, limit, total) {
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
      statusCode: 200,
      timestamp: new Date().toISOString(),
    };
  }
}

export { ApiResponse };
