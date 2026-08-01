"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { DollarSign, CheckCircle, XCircle, TrendingUp, AlertCircle, Search } from "lucide-react";
import toast from "react-hot-toast";

export default function BursarDashboard() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: pay } = await supabase
        .from("fee_payments")
        .select("*, students(admission_number, classes(name)), fee_structures(term, academic_year)")
        .order("created_at", { ascending: false })
        .limit(50);
      setPayments(pay || []);

      const { data: fs } = await supabase
        .from("fee_structures")
        .select("*, campuses(name)")
        .order("created_at", { ascending: false });
      setFeeStructures(fs || []);
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (id: string, status: "verified" | "rejected") => {
    const { error } = await supabase
      .from("fee_payments")
      .update({ status, verified_by: user?.id, verified_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update payment");
      return;
    }
    toast.success(`Payment ${status}`);
    loadData();
  };

  const filteredPayments = payments.filter((p) =>
    p.students?.admission_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.transaction_ref?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalVerified = payments.filter((p) => p.status === "verified").reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-bdja-primary to-bdja-accent rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Bursar Portal</h1>
        <p className="text-white/80 mt-1">Welcome back, {user?.full_name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">KES {totalVerified.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">KES {totalPending.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{payments.length}</p>
                <p className="text-xs text-gray-500">Total Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{feeStructures.length}</p>
                <p className="text-xs text-gray-500">Fee Structures</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-bdja-primary" />
              Payment Verification
            </CardTitle>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by admission or ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No payments found.</p>
          ) : (
            <div className="space-y-3">
              {filteredPayments.map((pay) => (
                <div key={pay.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">KES {pay.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">
                      {pay.students?.admission_number} - {pay.students?.classes?.name} - Ref: {pay.transaction_ref || "N/A"}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(pay.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={pay.status === "verified" ? "success" : pay.status === "pending" ? "warning" : "danger"}>
                      {pay.status}
                    </Badge>
                    {pay.status === "pending" && (
                      <>
                        <Button variant="primary" size="sm" onClick={() => verifyPayment(pay.id, "verified")}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Verify
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => verifyPayment(pay.id, "rejected")}>
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
