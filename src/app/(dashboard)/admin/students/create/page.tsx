"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import CredentialModal from "@/components/staff/CredentialModal";
import { ArrowLeft, Loader2, GraduationCap } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function CreateStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    admissionNumber: "",
    gradeLevel: "",
    classId: "",
    campusId: "",
    parentId: "",
    parentEmail: "",
    parentName: "",
    parentPhone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create student");

      setCreatedUser(data.student);
      setShowModal(true);
      toast.success("Student created successfully!");
      setForm({
        fullName: "", email: "", phone: "", admissionNumber: "", gradeLevel: "",
        classId: "", campusId: "", parentId: "", parentEmail: "", parentName: "", parentPhone: "",
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const gradeLevels = [
    "playgroup", "pp1", "pp2", "grade1", "grade2", "grade3",
    "grade4", "grade5", "grade6", "grade7", "grade8", "grade9",
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/students" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Student</h1>
          <p className="text-sm text-gray-500">Add a new student and optionally link a parent</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-bdja-primary" />
            Student Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@bdja.ac.ke"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number *</label>
              <Input
                value={form.admissionNumber}
                onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })}
                placeholder="BDJA-2026-001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level *</label>
              <select
                value={form.gradeLevel}
                onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary/20"
                required
              >
                <option value="">Select grade</option>
                {gradeLevels.map((g) => (
                  <option key={g} value={g}>{g.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class ID</label>
              <Input
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Parent Information (Optional)</h2>
          <p className="text-sm text-gray-500">Create a parent account or link to an existing one.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
              <Input
                value={form.parentName}
                onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                placeholder="Parent/Guardian Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
              <Input
                type="email"
                value={form.parentEmail}
                onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
                placeholder="parent@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label>
              <Input
                value={form.parentPhone}
                onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                placeholder="+2547XXXXXXXX"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Student
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/students")}>
            Cancel
          </Button>
        </div>
      </form>

      {createdUser && (
        <CredentialModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            router.push("/admin/students");
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
