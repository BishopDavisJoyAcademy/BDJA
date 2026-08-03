"use client";

/**
 * BDJA Auth Utilities
 * 
 * These helpers bypass @supabase/ssr v0.3.0's broken cookie handling
 * by managing a lightweight custom auth cookie ourselves.
 * 
 * The custom cookie stores ONLY the access_token (never the full session).
 * This avoids the 4KB browser cookie limit that breaks Supabase SSR cookies
 * when user_metadata is large.
 */

const AUTH_COOKIE_NAME = "bdja_auth_token";
const AUTH_STORAGE_KEY = "bdja_auth_token";

/**
 * Set the auth token in both cookie (for middleware/server) and
 * localStorage/sessionStorage (for client-side fallback).
 */
export function setAuthToken(token: string): void {
  try {
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
  } catch (e) {
    console.error("[auth-utils] Failed to set cookie:", e);
  }
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, token);
    sessionStorage.setItem(AUTH_STORAGE_KEY, token);
  } catch (e) {
    console.error("[auth-utils] Failed to set storage:", e);
  }
}

/**
 * Get the auth token from cookie (preferred) or storage fallback.
 */
export function getAuthToken(): string | null {
  // 1. Try cookie first (most reliable for same-origin requests)
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_COOKIE_NAME}=([^;]*)`));
    if (match) return decodeURIComponent(match[1]);
  } catch (e) {
    console.error("[auth-utils] Failed to read cookie:", e);
  }

  // 2. Try sessionStorage
  try {
    const t = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (t) return t;
  } catch {}

  // 3. Try localStorage
  try {
    const t = localStorage.getItem(AUTH_STORAGE_KEY);
    if (t) return t;
  } catch {}

  return null;
}

/**
 * Clear the auth token from all stores.
 */
export function clearAuthToken(): void {
  try {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  } catch {}
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {}
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {}
}

/**
 * Map a user role to its dashboard path.
 */
export function getDashboardPath(role: string | null): string {
  switch (role) {
    case "student": return "/student";
    case "parent": return "/parent";
    case "teacher": return "/teacher";
    case "principal":
    case "super_admin": return "/admin";
    case "bursar": return "/bursar";
    case "librarian": return "/librarian";
    default: return "/student";
  }
}
