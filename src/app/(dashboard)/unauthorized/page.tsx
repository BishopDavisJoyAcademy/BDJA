"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-500 mb-6 max-w-md">
        You do not have permission to access this page. If you believe this is an error, please contact your administrator.
      </p>
      <Button onClick={() => router.push("/")}>Go to Dashboard</Button>
    </div>
  );
}
