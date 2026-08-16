export class ApiError extends Error {
  constructor(message: string, public statusCode: number = 500, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

export class AuthRequiredError extends Error {
  constructor(message: string = "Please login to continue", public statusCode: number = 401) {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, public fields?: Record<string, string[]>) {
    super(message);
    this.name = "ValidationError";
  }
}

export class PermissionError extends Error {
  constructor(message: string = "Permission denied") {
    super(message);
    this.name = "PermissionError";
  }
}

export interface RuntimeError {
  id: string;
  message: string;
  stack?: string;
  component?: string;
  url: string;
  userId?: string;
  userEmail?: string;
  timestamp: string;
  resolved: boolean;
  joyAnalysis?: string;
  source: "client" | "server" | "api";
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return getErrorMessage(err);
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null && "message" in err && typeof (err as Record<string, unknown>).message === "string") {
    return (err as Record<string, string>).message;
  }
  return "An unexpected error occurred";
}

export function getErrorStack(err: unknown): string | undefined {
  if (err instanceof Error) return err.stack;
  return undefined;
}
