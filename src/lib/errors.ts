export class RuntimeError extends Error {
  constructor(
    message: string,
    public component?: string,
    public url?: string
  ) {
    super(message);
    this.name = "RuntimeError";
  }
}

export class AuthRequiredError extends Error {
  statusCode: number;
  constructor(message = "Authentication required", statusCode = 401) {
    super(message);
    this.name = "AuthRequiredError";
    this.statusCode = statusCode;
  }
}

export class PermissionDeniedError extends Error {
  statusCode: number;
  constructor(message = "Permission denied", statusCode = 403) {
    super(message);
    this.name = "PermissionDeniedError";
    this.statusCode = statusCode;
  }
}

export class ValidationError extends Error {
  statusCode: number;
  field?: string;
  constructor(message: string, field?: string, statusCode = 400) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.statusCode = statusCode;
  }
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof AuthRequiredError) return err.message;
  if (err instanceof PermissionDeniedError) return err.message;
  if (err instanceof ValidationError) return err.message;
  if (err instanceof RuntimeError) return err.message;
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "An unexpected error occurred";
}

export function getErrorStatusCode(err: unknown): number {
  if (err instanceof AuthRequiredError) return err.statusCode;
  if (err instanceof PermissionDeniedError) return err.statusCode;
  if (err instanceof ValidationError) return err.statusCode;
  return 500;
}

export function isAuthError(err: unknown): err is AuthRequiredError {
  return err instanceof AuthRequiredError;
}

export function isPermissionError(err: unknown): err is PermissionDeniedError {
  return err instanceof PermissionDeniedError;
}

export function isValidationError(err: unknown): err is ValidationError {
  return err instanceof ValidationError;
}
