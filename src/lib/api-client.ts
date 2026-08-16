import { getErrorMessage } from "./errors";

const API_BASE = "";

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiRequest<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  const data = (await res.json().catch(() => ({}))) as T & ApiErrorResponse;

  if (!res.ok) {
    const msg = data.error || data.message || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status);
  }

  return data;
}

export const apiGet = <T>(endpoint: string, options?: RequestInit) =>
  apiRequest<T>("GET", endpoint, undefined, options);

export const apiPost = <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
  apiRequest<T>("POST", endpoint, body, options);

export const apiPut = <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
  apiRequest<T>("PUT", endpoint, body, options);

export const apiPatch = <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
  apiRequest<T>("PATCH", endpoint, body, options);

export const apiDelete = <T>(endpoint: string, options?: RequestInit) =>
  apiRequest<T>("DELETE", endpoint, undefined, options);

export async function apiFetch(endpoint: string, options?: RequestInit) {
  const res = await fetch(
    endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`,
    options
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as ApiErrorResponse).error || `HTTP ${res.status}`
    );
  }
  return data;
}
