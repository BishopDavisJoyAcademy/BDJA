"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Profile, NotificationItem } from "@/types";

interface AppState {
  user: Profile | null;
  setUser: (user: Profile | null) => void;
  clearUser: () => void;
  notifications: NotificationItem[];
  setNotifications: (notifications: NotificationItem[]) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeCampus: string | null;
  setActiveCampus: (campusId: string | null) => void;
  joyOpen: boolean;
  setJoyOpen: (open: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  isOnboarding: boolean;
  setIsOnboarding: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null, notifications: [], unreadCount: 0 }),
      notifications: [],
      setNotifications: (notifications) => set({ notifications }),
      unreadCount: 0,
      setUnreadCount: (count) => set({ unreadCount: count }),
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      activeCampus: null,
      setActiveCampus: (campusId) => set({ activeCampus: campusId }),
      joyOpen: false,
      setJoyOpen: (open) => set({ joyOpen: open }),
      onboardingStep: 0,
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      isOnboarding: false,
      setIsOnboarding: (v) => set({ isOnboarding: v }),
    }),
    {
      name: "bdja-store-v2",
      // NEVER persist user data, notifications, or auth state to localStorage
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        activeCampus: state.activeCampus,
        joyOpen: state.joyOpen,
        onboardingStep: state.onboardingStep,
        isOnboarding: state.isOnboarding,
      }),
    }
  )
);
