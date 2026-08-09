"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ArrowLeft, Loader2, Copy, Check } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const GRADE_LEVELS = [
  "playgroup", "pp1", "pp2", "grade1", "grade2", "grade3", "grade4", "grade5", "grade6"
];

function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function CreateStudent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [credentials, setCredentials] = useState<{
    full_name: string;
    admission_number: string;
    pin: string;
    grade_level: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    admission_number: "",
    grade_level: "grade1",
    class_id: "",
    campus_id: "",
    parent_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.admission_number) {
      toast.error("Full name and admission number are required");
      return;
    }

    const pin = generatePin();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pin,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create student");

      setCredentials({
        full_name: form.full_name,
        admission_number: form.admission_number,
        pin,
        grade_level: form.grade_level,
      });
      setCreated(true);
      toast.success("Student created successfully!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!credentials) return;
    const text = `BDJA Student Login\n\nName: ${credentials.full_name}\nAdmission No: ${credentials.admission_number}\nPIN: ${credentials.pin}\nGrade: ${credentials.grade_level}\n\nLogin at: https://bdja.ac.ke/login`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (user?.user_category !== "admin") {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You do not have permission to access this page.</p>
      </div>
    );
  }

  if (created && credentials) {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-12">
        <div className="bg-white p-8 rounded-2xl border shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Student Created!</h2>
            <p className="text-gray-500">Share these credentials securely with the student.</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 space-y-4 text-left">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Full Name</label>
              <p className="text-sm font-medium text-gray-900">{credentials.full_name}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Admission Number</label>
              <p className="text-sm font-mono text-gray-900">{credentials.admission_number}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">PIN</label>
              <p className="text-sm font-mono text-bdja-primary font-bold text-lg">{credentials.pin}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Grade</label>
              <p className="text-sm text-gray-900 capitalize">{credentials.grade_level}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleCopy} variant="outline" className="flex-1 flex items-center gap-2">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Credentials"}
            </Button>
            <Link href="/admin/students" className="flex-1">
              <Button className="w-full">Done</Button>
            </Link>
          </div>

          <p className="text-xs text-gray-400">
            The student will be required to change this PIN on first login.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/students">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Student</h1>
          <p className="text-gray-500">Create a new student account with auto-generated PIN</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Jane Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number *</label>
            <Input
              value={form.admission_number}
              onChange={(e) => setForm({ ...form, admission_number: e.target.value })}
              placeholder="BDJA/2026/001"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
            <Select
              value={form.grade_level}
              onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class ID</label>
            <Input
              value={form.class_id}
              onChange={(e) => setForm({ ...form, class_id: e.target.value })}
              placeholder="UUID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campus ID</label>
            <Input
              value={form.campus_id}
              onChange={(e) => setForm({ ...form, campus_id: e.target.value })}
              placeholder="UUID"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent ID (optional)</label>
            <Input
              value={form.parent_id}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              placeholder="Parent profile UUID"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Student"}
          </Button>
          <Link href="/admin/students">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
