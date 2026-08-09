"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Plus, Search, Shield, Pencil } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import CredentialModal from "@/components/staff/CredentialModal";

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  user_category: string;
  is_active: boolean;
  staff?: {
    employee_id?: string;
    department?: string;
    designation?: string;
  };
}

export default function StaffManagement() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [credModal, setCredModal] = useState<{
    open: boolean;
    email: string;
    tempPassword: string;
    fullName: string;
    phone?: string;
  }>({ open: false, email: "", tempPassword: "", fullName: "" });

  useEffect(() => {
    if (!loading && user?.user_category !== "admin") {
      router.push("/unauthorized");
      return;
    }
    if (user?.user_category === "admin") {
      fetchStaff();
    }
  }, [user, loading, router]);

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/admin/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      const data = await res.json();
      setStaff(data.staff || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/staff?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !current }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Staff ${!current ? "activated" : "deactivated"}`);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = staff.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.staff?.department?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500">Manage all school staff members</p>
        </div>
        <Link href="/admin/staff/create">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Staff
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search staff by name, email, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No staff members found
                </td>
              </tr>
            ) : (
              filtered.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.full_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{member.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{member.staff?.department || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{member.staff?.designation || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={member.is_active ? "success" : "secondary"}>
                      {member.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/staff/edit/${member.id}`}>
                        <Button variant="ghost" size="sm" className="flex items-center gap-1">
                          <Pencil className="w-3 h-3" /> Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(member.id, member.is_active)}
                      >
                        {member.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      <CredentialModal
        isOpen={credModal.open}
        onClose={() => setCredModal({ ...credModal, open: false })}
        email={credModal.email}
        tempPassword={credModal.tempPassword}
        fullName={credModal.fullName}
        phone={credModal.phone}
      />
    </div>
  );
}
