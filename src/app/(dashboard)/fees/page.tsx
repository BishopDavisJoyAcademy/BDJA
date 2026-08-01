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
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";
import { DollarSign, Plus, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function FeesPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    student_id: "",
    fee_structure_id: "",
    amount: "",
    payment_method: "bank",
    transaction_ref: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);

  const canEdit = user ? hasPermission(user.role, "editFees") : false;

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { data: pay } = await supabase
      .from("fee_payments")
      .select("*, students(admission_number, profiles(full_name)), fee_structures(term, academic_year)")
      .order("created_at", { ascending: false });
    setPayments(pay || []);

    const { data: fs } = await supabase.from("fee_structures").select("*").order("created_at", { ascending: false });
    setFeeStructures(fs || []);

    const { data: st } = await supabase.from("students").select("*, profiles(full_name)").eq("status", "active");
    setStudents(st || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) { toast.error("No permission"); return; }

    const payload = {
      student_id: formData.student_id,
      fee_structure_id: formData.fee_structure_id,
      amount: parseFloat(formData.amount),
      payment_method: formData.payment_method,
      transaction_ref: formData.transaction_ref || null,
      notes: formData.notes || null,
      receipt_number: `RCP-${Date.now()}`,
    };

    const { error } = await supabase.from("fee_payments").insert(payload);
    if (error) { toast.error("Failed to record payment"); return; }
    toast.success("Payment recorded");
    setIsModalOpen(false);
    setFormData({ student_id: "", fee_structure_id: "", amount: "", payment_method: "bank", transaction_ref: "", notes: "" });
    loadData();
  };

  const verifyPayment = async (id: string, status: "verified" | "rejected") => {
    const { error } = await supabase.from("fee_payments").update({ status, verified_by: user?.id, verified_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Failed"); return; }
    toast.success(`Payment ${status}`);
    loadData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-bdja-dark">Fees & Payments</h1>
          <p className="text-gray-500 text-sm mt-1">Fee management and payment tracking</p>
        </div>
        {canEdit && (
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Record Payment
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-400">No payments recorded yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {payments.map((pay) => (
            <Card key={pay.id} className="card-hover">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-bdja-primary" />
                      <h3 className="font-semibold text-bdja-dark text-sm">KES {pay.amount.toLocaleString()}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pay.status === "verified" ? "bg-green-100 text-green-700" : pay.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        {pay.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{pay.students?.profiles?.full_name || pay.students?.admission_number} - {pay.fee_structures?.term} {pay.fee_structures?.academic_year}</p>
                    <p className="text-xs text-gray-400">Ref: {pay.transaction_ref || "N/A"} - {formatDate(pay.created_at)}</p>
                  </div>
                  {canEdit && pay.status === "pending" && (
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={() => verifyPayment(pay.id, "verified")}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Verify
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => verifyPayment(pay.id, "rejected")}>
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Payment">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })} required>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.profiles?.full_name || s.admission_number}</option>)}
          </Select>
          <Select value={formData.fee_structure_id} onChange={(e) => setFormData({ ...formData, fee_structure_id: e.target.value })} required>
            <option value="">Select fee structure</option>
            {feeStructures.map((f) => <option key={f.id} value={f.id}>{f.grade_level} - {f.term} {f.academic_year} (KES {f.total})</option>)}
          </Select>
          <Input type="number" placeholder="Amount (KES)" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
          <Select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}>
            {["bank", "mpesa", "cash", "other"].map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
          </Select>
          <Input placeholder="Transaction Reference" value={formData.transaction_ref} onChange={(e) => setFormData({ ...formData, transaction_ref: e.target.value })} />
          <textarea placeholder="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm min-h-[60px]" />
          <Button type="submit" variant="primary" className="w-full">Record Payment</Button>
        </form>
      </Modal>
    </div>
  );
}
