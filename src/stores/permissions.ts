import { create } from "zustand";

interface PermissionsState {
  permissions: string[];
  setPermissions: (permissions: string[]) => void;
  hasPermission: (key: string) => boolean;
  clearPermissions: () => void;
}

export const usePermissionsStore = create<PermissionsState>((set, get) => ({
  permissions: [],
  setPermissions: (permissions) => set({ permissions }),
  hasPermission: (key) => {
    const { permissions } = get();
    return permissions.includes(key) || permissions.includes("admin.access");
  },
  clearPermissions: () => set({ permissions: [] }),
}));
