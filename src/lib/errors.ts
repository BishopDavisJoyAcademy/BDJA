export class RuntimeError extends Error {
  readonly kind = "runtime" as const;
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
  readonly kind = "auth" as const;
  statusCode: number;
  constructor(message = "Authentication required", statusCode = 401) {
    super(message);
    this.name = "AuthRequiredError";
    this.statusCode = statusCode;
  }
}

export class PermissionDeniedError extends Error {
  readonly kind = "permission" as const;
  statusCode: number;
  constructor(message = "Permission denied", statusCode = 403) {
    super(message);
    this.name = "PermissionDeniedError";
    this.statusCode = statusCode;
  }
}

export class ValidationError extends Error {
  readonly kind = "validation" as const;
  statusCode: number;
  field?: string;
  constructor(message: string, field?: string, statusCode = 400) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.statusCode = statusCode;
  }
}

function errorHasName(err: unknown, name: string): boolean {
  return err instanceof Error && err.name === name;
}

export function getErrorMessage(err: unknown): string {
  if (errorHasName(err, "AuthRequiredError")) {
    return (err as AuthRequiredError).message;
  }
  if (errorHasName(err, "PermissionDeniedError")) {
    return (err as PermissionDeniedError).message;
  }
  if (errorHasName(err, "ValidationError")) {
    return (err as ValidationError).message;
  }
  if (errorHasName(err, "RuntimeError")) {
    return (err as RuntimeError).message;
  }
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "An unexpected error occurred";
}

export function getErrorStatusCode(err: unknown): number {
  if (typeof err === "object" && err !== null && "statusCode" in err) {
    const code = (err as Record<string, unknown>)["statusCode"];
    if (typeof code === "number") return code;
  }
  return 500;
}

export function isAuthError(err: unknown): err is AuthRequiredError {
  return err instanceof AuthRequiredError || errorHasName(err, "AuthRequiredError");
}

export function isPermissionError(err: unknown): err is PermissionDeniedError {
  return err instanceof PermissionDeniedError || errorHasName(err, "PermissionDeniedError");
}

export function isValidationError(err: unknown): err is ValidationError {
  return err instanceof ValidationError || errorHasName(err, "ValidationError");
}
