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
import { getPerformanceColor, formatDate } from "@/lib/utils";
import { GraduationCap, Plus, Trash2, Edit3, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";

export default function GradesPage() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<any>(null);
  const [formData, setFormData] = useState({
    student_id: "",
    subject_id: "",
    strand: "",
    sub_strand: "",
    specific_learning_outcome: "",
    performance_level: "beginning",
    score: "",
    max_score: "100",
    term: "Term 1",
    academic_year: "2026",
    change_reason: "",
  });
  const [loading, setLoading] = useState(true);

  const canEdit = user ? hasPermission(user.role, "editGrades") : false;

  useEffect(() => {
    if (!user) return;
    loadClasses();
    loadSubjects();
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
      loadGrades();
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    const { data } = await supabase.from("classes").select("*").order("name");
    setClasses(data || []);
    if (data && data.length > 0) setSelectedClass(data[0].id);
  };

  const loadSubjects = async () => {
    const { data } = await supabase.from("subjects").select("*").order("name");
    setSubjects(data || []);
  };

  const loadStudents = async () => {
    const { data } = await supabase.from("students").select("*, profiles(full_name)").eq("class_id", selectedClass).eq("status", "active");
    setStudents(data || []);
  };

  const loadGrades = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("assessments")
      .select("*, students(admission_number, profiles(full_name)), subjects(name)")
      .eq("class_id", selectedClass)
      .order("created_at", { ascending: false });
    setGrades(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) { toast.error("No permission"); return; }

    const payload = {
      ...formData,
      class_id: selectedClass,
      score: formData.score ? parseFloat(formData.score) : null,
      max_score: parseFloat(formData.max_score),
      assessed_by: user?.id,
    };

    if (editingGrade) {
      const { error } = await supabase.from("assessments").update(payload).eq("id", editingGrade.id);
      if (error) { toast.error("Failed to update"); return; }
      toast.success("Grade updated");
    } else {
      const { error } = await supabase.from("assessments").insert(payload);
      if (error) { toast.error("Failed to create"); return; }
      toast.success("Grade recorded");
    }

    setIsModalOpen(false);
    setEditingGrade(null);
    setFormData({ student_id: "", subject_id: "", strand: "", sub_strand: "", specific_learning_outcome: "", performance_level: "beginning", score: "", max_score: "100", term: "Term 1", academic_year: "2026", change_reason: "" });
    loadGrades();
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this grade?")) return;
    await supabase.from("assessments").delete().eq("id", id);
    toast.success("Grade deleted");
    loadGrades();
  };

  const openEdit = (g: any) => {
    setEditingGrade(g);
    setFormData({
      student_id: g.student_id,
      subject_id: g.subject_id,
      strand: g.strand,
      sub_strand: g.sub_strand,
      specific_learning_outcome: g.specific_learning_outcome || "",
      performance_level: g.performance_level,
      score: g.score?.toString() || "",
      max_score: g.max_score.toString(),
      term: g.term,
      academic_year: g.academic_year,
      change_reason: "",
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bdja-dark">Grades & Assessments</h1>
          <p className="text-gray-500 text-sm mt-1">CBC performance tracking</p>
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => { setEditingGrade(null); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Record Grade
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-64">
          <option value="">Select a class</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !selectedClass ? (
        <Card><CardContent className="p-12 text-center text-gray-400">Select a class to view grades</CardContent></Card>
      ) : grades.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-400">No grades recorded yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {grades.map((g) => (
            <Card key={g.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-bdja-primary" />
                      <h3 className="font-semibold text-bdja-dark">{g.students?.profiles?.full_name || g.students?.admission_number}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getPerformanceColor(g.performance_level)}`}>
                        {g.performance_level}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{g.subjects?.name} - {g.strand} / {g.sub_strand}</p>
                    {g.score && <p className="text-xs text-gray-400">Score: {g.score}/{g.max_score}</p>}
                    <p className="text-xs text-gray-400">{g.term} - {g.academic_year}</p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 ml-3">
                      <button onClick={() => openEdit(g)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <Edit3 className="w-4 h-4 text-gray-500" />
                      </button>
                      <button onClick={() => handleDelete(g.id)} className="p-1.5 hover:bg-red-100 rounded-lg">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGrade ? "Edit Grade" : "Record Grade"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
            <Select value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })} required>
              <option value="">Select student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.profiles?.full_name || s.admission_number}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <Select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} required>
              <option value="">Select subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Strand" value={formData.strand} onChange={(e) => setFormData({ ...formData, strand: e.target.value })} required />
            <Input placeholder="Sub-strand" value={formData.sub_strand} onChange={(e) => setFormData({ ...formData, sub_strand: e.target.value })} required />
          </div>
          <Input placeholder="Specific Learning Outcome" value={formData.specific_learning_outcome} onChange={(e) => setFormData({ ...formData, specific_learning_outcome: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Performance Level</label>
              <Select value={formData.performance_level} onChange={(e) => setFormData({ ...formData, performance_level: e.target.value })}>
                {["beginning", "developing", "competent", "exceeds"].map((l) => (
                  <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Score" value={formData.score} onChange={(e) => setFormData({ ...formData, score: e.target.value })} />
              <Input type="number" placeholder="Max" value={formData.max_score} onChange={(e) => setFormData({ ...formData, max_score: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Term" value={formData.term} onChange={(e) => setFormData({ ...formData, term: e.target.value })} required />
            <Input placeholder="Year" value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} required />
          </div>
          {editingGrade && (
            <Input placeholder="Reason for change" value={formData.change_reason} onChange={(e) => setFormData({ ...formData, change_reason: e.target.value })} required />
          )}
          <Button type="submit" variant="primary" className="w-full">{editingGrade ? "Update" : "Record"} Grade</Button>
        </form>
      </Modal>
    </div>
  );
}
