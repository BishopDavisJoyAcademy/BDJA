"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Table, TableHeader, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { BookOpen, Plus, Trash2, Edit3 } from "lucide-react";
import toast from "react-hot-toast";

const GRADE_LEVELS = ["playgroup", "pp1", "pp2", "grade1", "grade2", "grade3", "grade4", "grade5", "grade6"];

export default function SubjectsPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", code: "", grade_levels: [] as string[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("subjects").select("*").order("name");
    setSubjects(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.grade_levels.length === 0) { toast.error("Select at least one grade level"); return; }

    const payload = { name: formData.name, code: formData.code || null, grade_levels: formData.grade_levels };

    if (editingSubject) {
      const { error } = await supabase.from("subjects").update(payload).eq("id", editingSubject.id);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Subject updated");
    } else {
      const { error } = await supabase.from("subjects").insert(payload);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Subject created");
    }

    setIsModalOpen(false);
    setEditingSubject(null);
    setFormData({ name: "", code: "", grade_levels: [] });
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subject? This may affect existing timetables and grades.")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Subject deleted");
    loadData();
  };

  const toggleGrade = (grade: string) => {
    setFormData((prev) => ({
      ...prev,
      grade_levels: prev.grade_levels.includes(grade)
        ? prev.grade_levels.filter((g) => g !== grade)
        : [...prev.grade_levels, grade],
    }));
  };

  const openEdit = (s: any) => {
    setEditingSubject(s);
    setFormData({ name: s.name, code: s.code || "", grade_levels: s.grade_levels || [] });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bdja-dark">Subjects & Curriculum</h1>
          <p className="text-gray-500 text-sm mt-1">Manage what subjects are taught at each grade level</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingSubject(null); setFormData({ name: "", code: "", grade_levels: [] }); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Subject
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
                  <TableHead>Code</TableHead>
                  <TableHead>Grade Levels</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <tbody>
                {subjects.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.code || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(s.grade_levels || []).map((g: string) => (
                          <span key={g} className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-600">{g}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                          <Edit3 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-100 rounded-lg">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSubject ? "Edit Subject" : "Add Subject"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Subject Name (e.g. Mathematics)" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input placeholder="Subject Code (e.g. MATH)" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Grade Levels</label>
            <div className="flex flex-wrap gap-2">
              {GRADE_LEVELS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGrade(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    formData.grade_levels.includes(g)
                      ? "bg-bdja-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" variant="primary" className="w-full">{editingSubject ? "Update" : "Create"} Subject</Button>
        </form>
      </Modal>
    </div>
  );
}
