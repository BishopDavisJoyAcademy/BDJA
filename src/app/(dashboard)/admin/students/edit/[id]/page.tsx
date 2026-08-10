"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { AlertCircle, CheckCircle } from "lucide-react";
import { ADMIN_SEGMENT } from "@/lib/constants";

const GRADE_LEVELS = ["playgroup", "pp1", "pp2", "grade1", "grade2", "grade3", "grade4", "grade5", "grade6"];

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [form, setForm] = useState({ full_name: "", email: "", phone: "", admission_number: "", grade_level: "grade1", class_id: "", is_active: true });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/students?id=${id}`);
        const data = await res.json();
        if (data.student) {
          setForm({
            full_name: data.student.full_name || "",
            email: data.student.email || "",
            phone: data.student.phone || "",
            admission_number: data.student.students?.admission_number || "",
            grade_level: data.student.students?.grade_level || "grade1",
            class_id: data.student.students?.class_id || "",
            is_active: data.student.is_active ?? true,
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setFetching(false);
      }
    }
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/students?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setSaved(true);
      setTimeout(() => router.push(`/${ADMIN_SEGMENT}/students`), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  if (saved) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-xl border border-gray-200 p-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Student Updated!</h2>
        <p className="text-gray-500 mt-2">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Student</h1>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number</label>
            <input type="text" required value={form.admission_number} onChange={(e) => setForm({ ...form, admission_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
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
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button type="button" onClick={() => router.push(`/${ADMIN_SEGMENT}/students`)}
            className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
