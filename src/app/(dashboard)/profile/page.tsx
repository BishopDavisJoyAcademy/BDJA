"use client";

import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  User, Mail, Shield, GraduationCap, Briefcase,
  Building, Key, Loader2, ArrowLeft
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-bdja-primary" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-12 text-gray-500">Please log in.</div>;
  }

  const getRoleColor = () => {
    if (user.user_category === "admin") return "bg-purple-100 text-purple-700";
    if (user.user_category === "staff") return "bg-blue-100 text-blue-700";
    if (user.user_category === "student") return "bg-green-100 text-green-700";
    if (user.user_category === "parent") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-700";
  };

  const getRoleLabel = () => {
    if (user.user_category === "admin") return "Administrator";
    if (user.user_category === "staff") return user.designation || "Staff";
    if (user.user_category === "student") return `Student${user.grade_level ? ` — ${user.grade_level.toUpperCase()}` : ""}`;
    if (user.user_category === "parent") return "Parent";
    return "User";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">Your account information</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-bdja-primary rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
            {user.full_name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-medium ${getRoleColor()}`}>
              {getRoleLabel()}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-4 h-4 text-bdja-primary" />
            Personal
          </h3>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Full Name</span>
            <span className="text-sm font-medium">{user.full_name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-bdja-primary" />
            Account
          </h3>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Role</span>
            <span className="text-sm font-medium capitalize">{user.role}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Category</span>
            <span className="text-sm font-medium capitalize">{user.user_category}</span>
          </div>
          {user.department && (
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Department</span>
              <span className="text-sm font-medium">{user.department}</span>
            </div>
          )}
          {user.admission_number && (
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Admission #</span>
              <span className="text-sm font-medium">{user.admission_number}</span>
            </div>
          )}
        </Card>
      </div>

      {(user.user_category === "staff" || user.user_category === "admin") && user.permissions && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-bdja-primary" />
            Permissions ({user.permissions.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.permissions.map((perm: string) => (
              <span key={perm} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                {perm}
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        <Link href="/reset-password">
          <Button variant="outline" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Change Password
          </Button>
        </Link>
      </div>
    </div>
  );
}
