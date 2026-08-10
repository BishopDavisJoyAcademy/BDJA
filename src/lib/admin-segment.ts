"use server";

export function getAdminSegment(): string {
  return process.env.NEXT_PUBLIC_ADMIN_SEGMENT || "admin";
}

export function isAdminPath(pathname: string): boolean {
  const segment = getAdminSegment();
  return pathname === `/${segment}` || pathname.startsWith(`/${segment}/`);
}

export function getAdminUrl(path: string = ""): string {
  const segment = getAdminSegment();
  if (!path) return `/${segment}`;
  return `/${segment}${path.startsWith("/") ? path : "/" + path}`;
}

export function getAdminApiUrl(path: string = ""): string {
  const segment = getAdminSegment();
  if (!path) return `/api/${segment}`;
  return `/api/${segment}${path.startsWith("/") ? path : "/" + path}`;
}
