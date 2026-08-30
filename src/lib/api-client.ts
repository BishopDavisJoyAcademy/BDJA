"use client";

import { supabase } from "@/lib/supabase";
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

async function resolveAuthToken(): Promise<string | null> {
  // Fast path: read from local session storage
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;

  // Fallback: validate with Supabase Auth server (refreshes cookies if needed)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: { session: refreshed } } = await supabase.auth.getSession();
    return refreshed?.access_token || null;
  }

  return null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await resolveAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function apiRequest<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  options?: RequestInit
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const authHeaders = await getAuthHeaders();

  const res = await fetch(url, {
    method,
    headers: { ...authHeaders, ...(options?.headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
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
  const authHeaders = await getAuthHeaders();
  const res = await fetch(
    endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`,
    {
      credentials: "include",
      ...options,
      headers: { ...authHeaders, ...(options?.headers || {}) },
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as ApiErrorResponse).error || `HTTP ${res.status}`
    );
  }
  return data;
}
