class ApiResponse {
  constructor(statusCode, data, message = "Success", errors = undefined) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    if (errors !== undefined) this.errors = errors;
  }
}

export { ApiResponse };
