"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Wallet, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";

interface FeeRecord {
  id: string;
  student_id: string;
  amount: number;
  balance: number;
  term: string;
  academic_year: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export default function FeesPage() {
  const { user } = useAuth();
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) fetchFees();
  }, [user]);

  async function fetchFees() {
    try {
      setFetching(true);
      const res = await fetch("/api/fees");
      const data = await res.json();
      setFees(data.fees || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }

  const totalPaid = fees.filter((f) => f.status === "paid").reduce((sum, f) => sum + f.amount, 0);
  const totalBalance = fees.reduce((sum, f) => sum + f.balance, 0);

  const statusColors: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    overdue: "bg-red-100 text-red-700",
    partial: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fees</h1>
        <p className="text-gray-500">View fee payments and balances</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">KES {totalPaid.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Outstanding Balance</p>
          <p className="text-2xl font-bold text-red-600">KES {totalBalance.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Records</p>
          <p className="text-2xl font-bold text-gray-900">{fees.length}</p>
        </Card>
      </div>

      <Card className="p-6">
        {fetching ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : fees.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No fee records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Term</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Year</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Balance</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((f) => (
                  <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{f.term}</td>
                    <td className="py-3 px-4 text-gray-600">{f.academic_year}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">KES {f.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-900">KES {f.balance.toLocaleString()}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[f.status] || "bg-gray-100 text-gray-600"}`}>{f.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
