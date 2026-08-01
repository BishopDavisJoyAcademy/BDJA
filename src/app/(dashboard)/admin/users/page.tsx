"use client";

export const dynamic = 'force-dynamic';

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Users, Printer, Share2, Copy, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

interface CreatedUser {
  email: string;
  name: string;
  role: string;
  temp_password: string;
  admission_number?: string;
  login_url: string;
}

export default function UsersPage() {
  const [form, setForm] = useState({
    email: "", full_name: "", role: "student", campus_id: "", phone: "",
    admission_number: "", class_id: "", grade_level: "grade1",
    parent_name: "", parent_email: "", parent_phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedUser | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      const userData = form.role === "student" && data.student
        ? { ...data.student, role: "student" }
        : { email: data.email, name: data.name, role: data.role, temp_password: data.temp_password, login_url: data.login_url };

      setCreated(userData);
      setShowModal(true);
      toast.success("User created successfully!");
      setForm({ email: "", full_name: "", role: "student", campus_id: "", phone: "", admission_number: "", class_id: "", grade_level: "grade1", parent_name: "", parent_email: "", parent_phone: "" });
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!created) return;
    const html = `<!DOCTYPE html><html><head><title>BDJA Account - ${created.name}</title><style>body{font-family:Arial;max-width:600px;margin:40px auto;padding:20px;border:2px solid #1e3a5f;border-radius:8px;}h1{color:#1e3a5f;text-align:center;}.detail{margin:12px 0;font-size:16px;}.label{font-weight:bold;color:#1e3a5f;}.password{background:#c9a227;color:white;padding:8px 16px;border-radius:4px;display:inline-block;font-weight:bold;}.footer{margin-top:30px;text-align:center;font-size:12px;color:#666;border-top:1px solid #ddd;padding-top:15px;}</style></head><body><h1>BDJA Platform</h1><h2>Account Details</h2><div class="detail"><span class="label">Name:</span> ${created.name}</div><div class="detail"><span class="label">Role:</span> ${created.role}</div>${created.admission_number ? `<div class="detail"><span class="label">Admission:</span> ${created.admission_number}</div>` : ""}<div class="detail"><span class="label">Email:</span> ${created.email}</div><div class="detail"><span class="label">Temp Password:</span> <span class="password">${created.temp_password}</span></div><div class="detail"><span class="label">Login:</span> ${created.login_url}</div><div class="footer"><p>Change password after first login.</p></div><script>window.onload=()=>setTimeout(()=>window.print(),500);</script></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const handleWhatsApp = () => {
    if (!created) return;
    const lines = [`*BDJA Account Details*`, ``, `Hello ${created.name},`, `Your ${created.role} account is ready.`, ``, `*Login:*`, `Email: ${created.email}`, created.admission_number ? `Admission: ${created.admission_number}` : "", `Password: ${created.temp_password}`, ``, `*URL:* ${created.login_url}`, ``, `_Bishop Davis Joy Academy_`];
    const text = encodeURIComponent(lines.filter(Boolean).join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const copyPassword = () => {
    if (created?.temp_password) { navigator.clipboard.writeText(created.temp_password); toast.success("Password copied!"); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-bdja-dark">Manage Users</h1><p className="text-gray-500 text-sm mt-1">Add students, teachers, and staff to the platform</p></div>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Role *</label><Select value={form.role} onChange={e => setForm({...form, role: e.target.value})} options={[
              { value: "student", label: "Student" }, { value: "teacher", label: "Teacher" }, { value: "class_prefect", label: "Class Prefect" },
              { value: "bursar", label: "Bursar" }, { value: "librarian", label: "Librarian" }, { value: "principal", label: "Principal" }, { value: "super_admin", label: "Super Admin" },
            ]} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          </div>
          {form.role === "student" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Admission Number *</label><Input value={form.admission_number} onChange={e => setForm({...form, admission_number: e.target.value})} required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Grade Level *</label><Select value={form.grade_level} onChange={e => setForm({...form, grade_level: e.target.value})} options={[
                { value: "playgroup", label: "Playgroup" }, { value: "pp1", label: "PP1" }, { value: "pp2", label: "PP2" },
                { value: "grade1", label: "Grade 1" }, { value: "grade2", label: "Grade 2" }, { value: "grade3", label: "Grade 3" },
                { value: "grade4", label: "Grade 4" }, { value: "grade5", label: "Grade 5" }, { value: "grade6", label: "Grade 6" },
              ]} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Class ID *</label><Input value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})} placeholder="UUID of class" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Campus ID</label><Input value={form.campus_id} onChange={e => setForm({...form, campus_id: e.target.value})} placeholder="UUID of campus" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label><Input value={form.parent_name} onChange={e => setForm({...form, parent_name: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label><Input type="email" value={form.parent_email} onChange={e => setForm({...form, parent_email: e.target.value})} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Parent Phone</label><Input value={form.parent_phone} onChange={e => setForm({...form, parent_phone: e.target.value})} /></div>
            </div>
          )}
          <Button type="submit" variant="primary" isLoading={loading} className="w-full md:w-auto">Create User</Button>
        </form>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Account Created">
        {created && (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-2"><CheckCircle className="w-5 h-5" /><span className="font-semibold">Success!</span></div>
              <p className="text-sm text-green-800">{created.name} has been created with a temporary password.</p>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {created.name}</p>
              <p><strong>Email:</strong> {created.email}</p>
              {created.admission_number && <p><strong>Admission:</strong> {created.admission_number}</p>}
              <p><strong>Role:</strong> {created.role}</p>
              <div className="flex items-center gap-2">
                <strong>Password:</strong>
                <code className="bg-bdja-secondary text-white px-2 py-1 rounded text-sm font-mono">{created.temp_password}</code>
                <button onClick={copyPassword} className="text-gray-400 hover:text-gray-600"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2"><Printer className="w-4 h-4" /> Print Details</Button>
              <Button onClick={handleWhatsApp} variant="outline" className="flex items-center gap-2"><Share2 className="w-4 h-4" /> Share via WhatsApp</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
