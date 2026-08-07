"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Search, Eye, EyeOff, Shield, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface UserResult {
  id: string;
  email: string;
  full_name: string;
  user_category: string;
  is_active: boolean;
}

export default function GodModePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && user?.user_category !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, loading, router]);

  const searchUsers = async () => {
    if (!search.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/impersonate?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        toast.error(data.error || "Search failed");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startImpersonation = async (targetId: string) => {
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: targetId }),
      });
      const data = await res.json();
      if (res.ok) {
        setImpersonating(targetId);
        toast.success(`Now viewing as ${data.targetUser.full_name}`);
        const cat = data.targetUser.user_category;
        if (cat === "student") router.push("/student");
        else if (cat === "staff") router.push("/teacher");
        else router.push("/");
      } else {
        toast.error(data.error || "Impersonation failed");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const exitImpersonation = async () => {
    try {
      await fetch("/api/admin/impersonate/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: impersonating }),
      });
      setImpersonating(null);
      toast.success("Returned to admin view");
      router.push("/admin");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-bdja-primary" />
          God Mode
        </h1>
        <p className="text-gray-500">Preview any portal as any user without their credentials</p>
      </div>

      {impersonating && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">Impersonation Active</p>
              <p className="text-xs text-amber-600">You are currently viewing the platform as another user.</p>
            </div>
          </div>
          <Button onClick={exitImpersonation} variant="outline" size="sm" className="text-amber-700 border-amber-300">
            <EyeOff className="w-4 h-4 mr-1" />
            Exit View
          </Button>
        </div>
      )}

      <Card className="p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
        <div className="flex gap-2">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchUsers()}
            className="flex-1"
          />
          <Button onClick={searchUsers} disabled={isLoading}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {users.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={u.user_category === "staff" ? "default" : "info"}>
                      {u.user_category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.is_active ? "success" : "default"}>
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startImpersonation(u.id)}
                      className="text-bdja-primary"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View As
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
