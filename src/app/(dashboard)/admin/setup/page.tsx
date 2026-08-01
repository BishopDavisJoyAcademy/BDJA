"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Shield, CheckCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function SetupSuperAdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; email?: string; message?: string; error?: string } | null>(null);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/setup-super-admin", { method: "POST" });
      const data = await res.json();
      setResult(data);
      if (data.success) toast.success(data.message);
      else toast.error(data.error || "Setup failed");
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-bdja-dark">Super Admin Setup</h1>
        <p className="text-gray-500 text-sm mt-1">Create the initial super admin account from environment variables</p>
      </div>
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-bdja-secondary" />
          <div>
            <h3 className="font-semibold text-bdja-dark">One-Time Setup</h3>
            <p className="text-sm text-gray-500">This creates the super admin using values from your .env.local file</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm space-y-1">
          <p><strong>Required env vars:</strong></p>
          <code className="text-xs bg-gray-200 px-1 rounded">SUPER_ADMIN_EMAIL</code>
          <code className="text-xs bg-gray-200 px-1 rounded">SUPER_ADMIN_PASSWORD</code>
          <code className="text-xs bg-gray-200 px-1 rounded">SUPER_ADMIN_NAME</code>
        </div>
        <Button onClick={handleSetup} isLoading={loading} variant="primary" className="w-full">Create Super Admin</Button>
        {result?.success && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" /> {result.message} ({result.email})
          </div>
        )}
        {result?.error && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" /> {result.error}
          </div>
        )}
      </Card>
    </div>
  );
}
