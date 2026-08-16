"use client";

import { supabase } from "@/lib/supabase";

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAuthToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && tokenExpiry > now + 60000) return cachedToken;
  const { data: { session } } = await supabase.auth.getSession();
  cachedToken = session?.access_token || null;
  tokenExpiry = session?.expires_at ? session.expires_at * 1000 : 0;
  return cachedToken;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");
  return fetch(input, { ...init, headers, credentials: "include" });
}

export async function apiGet(url: string): Promise<unknown> {
  const res = await apiFetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPost(url: string, body: unknown): Promise<unknown> {
  const res = await apiFetch(url, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPut(url: string, body: unknown): Promise<unknown> {
  const res = await apiFetch(url, { method: "PUT", body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiPatch(url: string, body?: unknown): Promise<unknown> {
  const res = await apiFetch(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(url: string): Promise<unknown> {
  const res = await apiFetch(url, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json();
}
