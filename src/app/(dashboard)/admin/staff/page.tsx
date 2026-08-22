"use client";

import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api-client";
import { supabase } from "@/lib/supabase-client";
import { getErrorMessage } from "@/lib/errors";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Plus, Pencil, Trash2, Users, Key, X, CheckCircle, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ADMIN_SEGMENT } from "@/lib/constants";

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  password_changed: boolean;
  staff?: {
    department: string;
    designation: string;
    employee_id: string;
  };
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [credentials, setCredentials] = useState<{ id: string; name: string; email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<{ staff: StaffMember[] }>("/api/admin/staff");
      setStaff(data.staff || []);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this staff member permanently?")) return;
    try {
      const { data: { session: delSession } } = await supabase.auth.getSession();
      const delToken = delSession?.access_token || "";
      const res = await fetch(`/api/admin/staff?id=${id}`, { method: "DELETE", credentials: "include", headers: { "Authorization": `Bearer ${delToken}` } });
      if (!res.ok) throw new Error("Failed to delete");
      setStaff((prev) => prev.filter((s) => s.id !== id));
      toast.success("Staff member deleted");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleGenerateCredentials = async (member: StaffMember) => {
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_credentials", id: member.id }),
      });
      if (!res.ok) throw new Error("Failed to generate credentials");
      const data = await res.json();
      setCredentials({ id: member.id, name: member.full_name, email: member.email, tempPassword: data.tempPassword });
      toast.success("Credentials generated");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const filtered = staff.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.staff?.department || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
        <p className="font-medium mb-2">Failed to load staff</p>
        <p className="text-sm">{error}</p>
        <Button onClick={fetchStaff} className="mt-3" size="sm">
          <Loader2 className="w-3 h-3 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff</h1>
          <p className="text-sm text-gray-400 mt-1">Manage staff members and their roles</p>
        </div>
        <Link href={`/${ADMIN_SEGMENT}/staff/create`}>
          <Button><Plus className="w-4 h-4 mr-2" />Add Staff</Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {credentials && (
        <Card className="p-5 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-emerald-400 flex items-center gap-2"><Key className="w-4 h-4" /> Generated Credentials</h3>
              <p className="text-sm text-gray-300 mt-2"><strong>Name:</strong> {credentials.name}</p>
              <p className="text-sm text-gray-300"><strong>Email:</strong> {credentials.email}</p>
              <p className="text-sm text-gray-300"><strong>Temp Password:</strong> <span className="font-mono text-amber-400">{credentials.tempPassword}</span></p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setCredentials(null)}><X className="w-4 h-4" /></Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Designation</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((s) => (
                <tr key={s.id} className="text-gray-300 hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span className="font-medium">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{s.email}</td>
                  <td className="px-4 py-3">{s.staff?.department || "—"}</td>
                  <td className="px-4 py-3">{s.staff?.designation || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs border-0 ${s.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {s.is_active ? <><CheckCircle className="w-3 h-3 mr-1" />Active</> : "Inactive"}
                    </Badge>
                    {!s.password_changed && <Badge className="bg-amber-500/10 text-amber-400 border-0 text-xs ml-1">First Login</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/${ADMIN_SEGMENT}/staff/edit/${s.id}`}>
                        <Button size="sm" variant="ghost"><Pencil className="w-4 h-4" /></Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => handleGenerateCredentials(s)}>
                        <Key className="w-4 h-4 text-cyan-400" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No staff members found.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
