"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Plus, Edit, Eye, AlertCircle } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  staff?: { department: string; designation: string };
}

export default function StaffListPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStaff() {
      try {
        const res = await fetch("/api/admin/staff");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setStaff(data.staff || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStaff();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2"><AlertCircle className="w-5 h-5" />{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <Link href={`/${ADMIN_SEGMENT}/staff/create`} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Staff
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Department</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{member.full_name}</td>
                <td className="px-4 py-3 text-gray-600">{member.email}</td>
                <td className="px-4 py-3 text-gray-600">{member.staff?.department || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${member.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {member.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/${ADMIN_SEGMENT}/staff/edit/${member.id}`} className="text-blue-600 hover:text-blue-700">
                      <Edit className="w-4 h-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No staff members found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
