import { create } from "zustand";
import { Permission, PermissionCategory } from "@/types";

interface PermissionState {
  permissions: string[];
  allPermissions: Permission[];
  categories: PermissionCategory[];
  isLoading: boolean;
  error: string | null;
  fetchPermissions: () => Promise<void>;
  hasPermission: (key: string) => boolean;
  hasAnyPermission: (keys: string[]) => boolean;
  clear: () => void;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  allPermissions: [],
  categories: [],
  isLoading: false,
  error: null,

  fetchPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/auth/permissions");
      if (!res.ok) throw new Error("Failed to fetch permissions");
      const data = await res.json();
      set({
        permissions: data.permissions || [],
        allPermissions: data.allPermissions || [],
        categories: data.categories || [],
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  hasPermission: (key: string) => {
    const { permissions } = get();
    return permissions.includes(key);
  },

  hasAnyPermission: (keys: string[]) => {
    const { permissions } = get();
    return keys.some((k) => permissions.includes(k));
  },

  clear: () => {
    set({ permissions: [], allPermissions: [], categories: [], error: null });
  },
}));
