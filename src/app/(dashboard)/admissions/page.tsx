"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatDate } from "@/lib/utils";
import { ClipboardList, Plus, ChevronRight, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const statusFlow = ["received", "review", "interview", "accepted", "enrolled"];

export default function AdmissionsPage() {
  const { user } = useAuth();
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    grade_applied: "playgroup",
    campus_id: "",
    parent_name: "",
    parent_phone: "",
    parent_email: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
    loadCampuses();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from("admissions").select("*, campuses(name)").order("created_at", { ascending: false });
    setAdmissions(data || []);
    setLoading(false);
  };

  const loadCampuses = async () => {
    const { data } = await supabase.from("campuses").select("*");
    setCampuses(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      campus_id: formData.campus_id || campuses[0]?.id,
    };
    const { error } = await supabase.from("admissions").insert(payload);
    if (error) { toast.error("Failed to submit"); return; }
    toast.success("Application submitted");
    setIsModalOpen(false);
    setFormData({ first_name: "", last_name: "", date_of_birth: "", gender: "", grade_applied: "playgroup", campus_id: "", parent_name: "", parent_phone: "", parent_email: "" });
    loadData();
  };

  const advanceStatus = async (id: string, currentStatus: string) => {
    const idx = statusFlow.indexOf(currentStatus);
    if (idx === -1 || idx >= statusFlow.length - 1) return;
    const nextStatus = statusFlow[idx + 1];
    const { error } = await supabase.from("admissions").update({ status: nextStatus, reviewed_by: user?.id }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Status updated to ${nextStatus}`);
    loadData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bdja-dark">Admissions</h1>
          <p className="text-gray-500 text-sm mt-1">Manage student applications</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Application
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : admissions.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-400">No applications yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {admissions.map((adm) => (
            <Card key={adm.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-bdja-primary" />
                      <h3 className="font-semibold text-bdja-dark text-sm">{adm.first_name} {adm.last_name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 capitalize">{adm.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{adm.grade_applied} - {adm.campuses?.name}</p>
                    <p className="text-xs text-gray-400">Parent: {adm.parent_name} - {adm.parent_phone}</p>
                    <p className="text-xs text-gray-400">Applied: {formatDate(adm.created_at)}</p>
                    {adm.admission_number && <p className="text-xs text-bdja-secondary font-medium mt-1">Admission No: {adm.admission_number}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {adm.status !== "enrolled" && adm.status !== "rejected" && (
                      <Button variant="primary" size="sm" onClick={() => advanceStatus(adm.id, adm.status)}>
                        Advance <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Application">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="First Name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required />
            <Input placeholder="Last Name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" placeholder="Date of Birth" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} />
            <Select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
          </div>
          <Select value={formData.grade_applied} onChange={(e) => setFormData({ ...formData, grade_applied: e.target.value })}>
            {["playgroup", "pp1", "pp2", "grade1", "grade2", "grade3", "grade4", "grade5", "grade6"].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
          <Select value={formData.campus_id} onChange={(e) => setFormData({ ...formData, campus_id: e.target.value })}>
            <option value="">Select campus</option>
            {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input placeholder="Parent Name" value={formData.parent_name} onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })} />
          <Input placeholder="Parent Phone" value={formData.parent_phone} onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })} />
          <Input type="email" placeholder="Parent Email" value={formData.parent_email} onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })} />
          <Button type="submit" variant="primary" className="w-full">Submit Application</Button>
        </form>
      </Modal>
    </div>
  );
}
