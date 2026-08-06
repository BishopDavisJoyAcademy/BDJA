"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import PermissionSelector from "@/components/permissions/PermissionSelector";
import CredentialModal from "@/components/staff/CredentialModal";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function CreateStaffPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          permissionIds: selectedPermissions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create staff");

      setCreatedUser(data.staff);
      setShowModal(true);
      toast.success("Staff member created successfully!");
      setForm({ fullName: "", email: "", phone: "", department: "", designation: "" });
      setSelectedPermissions([]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/staff" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Staff Member</h1>
          <p className="text-sm text-gray-500">Add a new staff member and assign permissions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-bdja-primary" />
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@bdja.ac.ke"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+2547XXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <Input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Academics"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
              <Input
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="Teacher"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h2>
          <p className="text-sm text-gray-500 mb-4">
            Select what this staff member is allowed to manage. You can change these anytime.
          </p>
          <PermissionSelector
            selectedIds={selectedPermissions}
            onChange={setSelectedPermissions}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Staff Member
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/staff")}>
            Cancel
          </Button>
        </div>
      </form>

      {createdUser && (
        <CredentialModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            router.push("/admin/staff");
          }}
          email={createdUser.email}
          tempPassword={createdUser.temp_password}
          fullName={createdUser.full_name}
          phone={form.phone}
        />
      )}
    </div>
  );
}
