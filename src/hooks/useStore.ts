"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Profile, UserRole, NotificationItem } from "@/types";

interface AppState {
  user: Profile | null;
  setUser: (user: Profile | null) => void;
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
      notifications: [],
      setNotifications: (notifications) => set({ notifications }),
      unreadCount: 0,
      setUnreadCount: (unreadCount) => set({ unreadCount }),
      sidebarOpen: false,
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      activeCampus: null,
      setActiveCampus: (activeCampus) => set({ activeCampus }),
      joyOpen: false,
      setJoyOpen: (joyOpen) => set({ joyOpen }),
      onboardingStep: 0,
      setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
      isOnboarding: false,
      setIsOnboarding: (isOnboarding) => set({ isOnboarding }),
    }),
    {
      name: "bdja-store",
      partialize: (state) => ({
        activeCampus: state.activeCampus,
        onboardingStep: state.onboardingStep,
        isOnboarding: state.isOnboarding,
      }),
    }
  )
);
