"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_SEGMENT } from "@/lib/constants";
import WorldClassLoader from "@/components/loading/WorldClassLoader";

export default function DashboardRedirector() {
  const router = useRouter();
  const { user, loading, error } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const cat = user.user_category;
    if (cat === "admin") router.replace(`/${ADMIN_SEGMENT}`);
    else if (cat === "staff") router.replace("/teacher");
    else if (cat === "parent") router.replace("/parent");
    else router.replace("/student");
  }, [user, loading, router]);

  // Show world-class loader while loading OR if there's an auth error
  if (loading || (!user && !error)) {
    return (
      <WorldClassLoader
        timeoutSeconds={10}
        onTimeout={() => {
          // If timeout fires, the loader shows an error state with reload button
        }}
      />
    );
  }

  // If auth errored out, still show the loader (it handles error display)
  if (error) {
    return (
      <WorldClassLoader
        timeoutSeconds={1}
        error={error.message}
      />
    );
  }

  // Fallback — should never reach here, but just in case
  return (
    <WorldClassLoader timeoutSeconds={5} />
  );
}
