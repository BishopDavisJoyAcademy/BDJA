"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { BookOpen, Plus, Trash2, Edit3, FileText } from "lucide-react";
import toast from "react-hot-toast";

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [formData, setFormData] = useState({
    class_id: "",
    subject_id: "",
    title: "",
    description: "",
    due_date: "",
    status: "published",
  });
  const [loading, setLoading] = useState(true);

  const canEdit = user ? hasPermission(user.role, "editAssignments") : false;

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data: ass } = await supabase
      .from("assignments")
      .select("*, classes(name), subjects(name)")
      .order("created_at", { ascending: false });
    setAssignments(ass || []);

    const { data: cls } = await supabase.from("classes").select("*").order("name");
    setClasses(cls || []);

    const { data: sub } = await supabase.from("subjects").select("*").order("name");
    setSubjects(sub || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) { toast.error("No permission"); return; }

    const payload = {
      ...formData,
      teacher_id: user?.id,
      due_date: formData.due_date || null,
    };

    if (editingAssignment) {
      const { error } = await supabase.from("assignments").update(payload).eq("id", editingAssignment.id);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Assignment updated");
    } else {
      const { error } = await supabase.from("assignments").insert(payload);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Assignment created");
    }

    setIsModalOpen(false);
    setEditingAssignment(null);
    setFormData({ class_id: "", subject_id: "", title: "", description: "", due_date: "", status: "published" });
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this assignment?")) return;
    await supabase.from("assignments").delete().eq("id", id);
    toast.success("Assignment deleted");
    loadData();
  };

  const openEdit = (ass: any) => {
    setEditingAssignment(ass);
    setFormData({
      class_id: ass.class_id,
      subject_id: ass.subject_id,
      title: ass.title,
      description: ass.description || "",
      due_date: ass.due_date ? ass.due_date.slice(0, 16) : "",
      status: ass.status,
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bdja-dark">Assignments</h1>
          <p className="text-gray-500 text-sm mt-1">Manage class assignments</p>
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => { setEditingAssignment(null); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Assignment
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : assignments.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-400">No assignments yet.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {assignments.map((ass) => (
            <Card key={ass.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-bdja-primary" />
                      <h3 className="font-semibold text-bdja-dark">{ass.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{ass.classes?.name} - {ass.subjects?.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{ass.description}</p>
                    {ass.due_date && <p className="text-xs text-red-500 mt-2">Due: {formatDate(ass.due_date)}</p>}
                    <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${ass.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {ass.status}
                    </span>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 ml-3">
                      <button onClick={() => openEdit(ass)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <Edit3 className="w-4 h-4 text-gray-500" />
                      </button>
                      <button onClick={() => handleDelete(ass.id)} className="p-1.5 hover:bg-red-100 rounded-lg">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAssignment ? "Edit Assignment" : "New Assignment"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <Select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })} required>
              <option value="">Select class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <Select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} required>
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bdja-primary text-sm min-h-[80px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <Input type="datetime-local" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
          </div>
          <Button type="submit" variant="primary" className="w-full">{editingAssignment ? "Update" : "Create"} Assignment</Button>
        </form>
      </Modal>
    </div>
  );
}
