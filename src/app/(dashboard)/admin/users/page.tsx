"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableHeader, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Users, Plus, UserCheck, UserX } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    phone: "",
    role: "teacher",
    campus_id: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
    loadCampuses();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*, campuses(name)").order("created_at", { ascending: false });
    setProfiles(data || []);
    setLoading(false);
  };

  const loadCampuses = async () => {
    const { data } = await supabase.from("campuses").select("*");
    setCampuses(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData }),
      });
      if (!res.ok) throw new Error("Failed to create user");
      toast.success("User created successfully");
      setIsModalOpen(false);
      setFormData({ email: "", full_name: "", phone: "", role: "teacher", campus_id: "" });
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_active: !current }).eq("id", id);
    if (error) { toast.error("Failed"); return; }
    toast.success(`User ${current ? "deactivated" : "activated"}`);
    loadData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bdja-dark">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage platform users</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <tbody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell><span className="capitalize">{p.role.replace("_", " ")}</span></TableCell>
                    <TableCell>{p.campuses?.name || "-"}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(p.id, p.is_active)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                        {p.is_active ? <UserX className="w-4 h-4 text-red-500" /> : <UserCheck className="w-4 h-4 text-green-500" />}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New User">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Full Name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
          <Input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          <Input placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          <Select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
            {["student", "parent", "teacher", "class_prefect", "bursar", "librarian", "principal", "super_admin"].map((r) => (
              <option key={r} value={r}>{r.replace("_", " ").toUpperCase()}</option>
            ))}
          </Select>
          <Select value={formData.campus_id} onChange={(e) => setFormData({ ...formData, campus_id: e.target.value })}>
            <option value="">Select campus</option>
            {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <p className="text-xs text-gray-400">Default password is set via environment variable DEFAULT_PASSWORD</p>
          <Button type="submit" variant="primary" className="w-full">Create User</Button>
        </form>
      </Modal>
    </div>
  );
}
