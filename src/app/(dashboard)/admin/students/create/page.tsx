"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";

const GRADE_LEVELS = ["playgroup", "pp1", "pp2", "grade1", "grade2", "grade3", "grade4", "grade5", "grade6"];

export default function CreateStudentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "", full_name: "", phone: "", admission_number: "", grade_level: "grade1",
    class_id: "", campus_id: "", parent_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ email: string; tempPassword: string; admission_number: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create student");
      setResult({ email: data.email, tempPassword: data.tempPassword, admission_number: form.admission_number });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-xl border border-gray-200 p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Student Created Successfully!</h2>
        <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2 mb-4">
          <p className="text-sm"><span className="font-medium">Email:</span> {result.email}</p>
          <p className="text-sm"><span className="font-medium">Admission #:</span> {result.admission_number}</p>
          <p className="text-sm"><span className="font-medium">Temporary PIN:</span> <span className="font-mono bg-yellow-100 px-2 py-0.5 rounded">{result.tempPassword}</span></p>
        </div>
        <p className="text-sm text-red-600 mb-4">Copy this PIN now. It will not be shown again.</p>
        <button onClick={() => router.push(`/${ADMIN_SEGMENT}/students`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Back to Students List
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Student</h1>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number *</label>
            <input type="text" required value={form.admission_number} onChange={(e) => setForm({ ...form, admission_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level *</label>
            <select value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g.replace("grade", "Grade ").replace("pp", "PP ").replace("playgroup", "Playgroup")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class ID</label>
            <input type="text" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
          {loading ? "Creating..." : "Create Student"}
        </button>
      </form>
    </div>
  );
}
