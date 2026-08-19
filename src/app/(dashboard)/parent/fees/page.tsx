"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Loader2, DollarSign, ArrowLeft, CheckCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

interface FeePayment {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  receipt_number?: string;
  paid_at?: string;
  fee_structures?: { grade_level: string; term: string; academic_year: string };
}

export default function ParentFeesPage() {
  const searchParams = useSearchParams();
  const childId = searchParams.get("child");
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState("");
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    if (!childId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/parent/fees?child=${childId}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setPayments(data.payments || []);
          setChildName(data.child_name || "");
          setTotalPaid(data.total_paid || 0);
          setTotalPending(data.total_pending || 0);
        } else throw new Error(data.error);
      } catch (err: any) {
        if (!cancelled) toast.error(err.message || "Failed to load fees");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [childId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-bdja-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/parent" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Fee Balance
          </h1>
          <p className="text-sm text-gray-500">{childName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-green-700">Total Paid</p>
              <p className="text-2xl font-bold text-green-800">KES {totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-sm text-amber-700">Pending Balance</p>
              <p className="text-2xl font-bold text-amber-800">KES {totalPending.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {payments.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <p className="text-gray-500">No payment records found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Term</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Method</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {p.fee_structures?.term} {p.fee_structures?.academic_year}
                  </td>
                  <td className="px-4 py-3 font-medium">KES {p.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 capitalize">{p.payment_method}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      p.status === "verified" ? "bg-green-50 text-green-700" :
                      p.status === "pending" ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
