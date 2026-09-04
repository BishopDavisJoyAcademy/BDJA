"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  Receipt,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Download,
  Loader2,
  Calendar,
  GraduationCap,
  Wallet,
  FileText,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const GOLD = "#D4AF37";

interface FeePayment {
  id: string;
  amount: number;
  payment_method: string;
  status: "pending" | "verified" | "rejected" | "refunded";
  receipt_number: string | null;
  receipt_url: string | null;
  transaction_ref: string | null;
  notes: string | null;
  created_at: string;
  verified_at: string | null;
  fee_structures: {
    grade_level: string;
    term: string;
    academic_year: string;
  } | null;
}

interface FeeStructure {
  id: string;
  grade_level: string;
  term: string;
  academic_year: string;
  tuition: number;
  uniform: number | null;
  transport: number | null;
  activity_fees: number | null;
  other_fees: Record<string, number> | null;
  total: number | null;
}

const statusConfig = {
  verified: { label: "Verified", color: "#22c55e", bg: "rgba(34, 197, 94, 0.15)", border: "rgba(34, 197, 94, 0.3)", icon: CheckCircle2 },
  pending: { label: "Pending", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)", icon: Clock },
  rejected: { label: "Rejected", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)", icon: XCircle },
  refunded: { label: "Refunded", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.3)", icon: AlertCircle },
};

const methodLabels: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  mpesa: "M-Pesa",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

export default function StudentFeesPage() {
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const [paymentsRes, structuresRes] = await Promise.all([
        fetch("/api/fees", { headers }),
        fetch("/api/admin/fee-structures", { headers }),
      ]);

      if (!paymentsRes.ok) {
        const err = await paymentsRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch payments");
      }

      const paymentsData = await paymentsRes.json();
      setPayments(paymentsData.fees || []);

      // Fee structures might 403 for students, that's OK
      if (structuresRes.ok) {
        const structuresData = await structuresRes.json();
        setStructures(structuresData.feeStructures || []);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not load fee data");
      toast.error(getErrorMessage(err) || "Could not load fee data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stats
  const totalPaid = payments
    .filter((p) => p.status === "verified")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRejected = payments
    .filter((p) => p.status === "rejected")
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8" style={{ color: GOLD }} />
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 rounded-xl text-sm font-medium"
          style={{ background: `${GOLD}15`, color: GOLD }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold text-white">Fees & Payments</h1>
          <p className="text-sm text-slate-400 mt-1">View your fee structure and payment history</p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {[
          { label: "Total Paid", value: totalPaid, color: "#22c55e", icon: CheckCircle2 },
          { label: "Pending", value: totalPending, color: "#f59e0b", icon: Clock },
          { label: "Rejected", value: totalRejected, color: "#ef4444", icon: XCircle },
          { label: "Transactions", value: payments.length, color: GOLD, icon: Receipt },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.03 }}
            className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.label === "Transactions" ? stat.value : `KES ${stat.value.toLocaleString()}`}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Payment History */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4" style={{ color: GOLD }} />
            <h2 className="text-sm font-medium text-white">Payment History</h2>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No payment records found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {payments.map((payment, i) => {
              const cfg = statusConfig[payment.status] || statusConfig.pending;
              return (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.03 }}
                  className="p-4 flex items-start gap-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                  >
                    <cfg.icon className="w-5 h-5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          KES {payment.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {methodLabels[payment.payment_method] || payment.payment_method}
                          {payment.fee_structures && (
                            <span className="ml-1">
                              · {payment.fee_structures.grade_level} · {payment.fee_structures.term} ·{" "}
                              {payment.fee_structures.academic_year}
                            </span>
                          )}
                        </p>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium uppercase"
                        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[11px] text-slate-500">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {new Date(payment.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {payment.receipt_number && (
                        <span className="text-[11px] text-slate-500">
                          <FileText className="w-3 h-3 inline mr-1" />
                          {payment.receipt_number}
                        </span>
                      )}
                      {payment.transaction_ref && (
                        <span className="text-[11px] text-slate-500">
                          Ref: {payment.transaction_ref}
                        </span>
                      )}
                    </div>
                    {payment.notes && (
                      <p className="text-xs text-slate-400 mt-1">{payment.notes}</p>
                    )}
                  </div>
                  {payment.receipt_url && (
                    <a
                      href={payment.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all shrink-0"
                      title="Download Receipt"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Fee Structure Info */}
      {structures.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden"
        >
          <div className="p-5 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" style={{ color: GOLD }} />
              <h2 className="text-sm font-medium text-white">Fee Structure</h2>
            </div>
          </div>
          <div className="divide-y divide-slate-700/30">
            {structures.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.03 }}
                className="p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-white">
                    {s.grade_level} · {s.term} · {s.academic_year}
                  </p>
                  <span className="text-sm font-bold" style={{ color: GOLD }}>
                    KES {s.total?.toLocaleString() || s.tuition.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-400">
                  <span>Tuition: KES {s.tuition.toLocaleString()}</span>
                  {s.uniform !== null && <span>Uniform: KES {s.uniform.toLocaleString()}</span>}
                  {s.transport !== null && <span>Transport: KES {s.transport.toLocaleString()}</span>}
                  {s.activity_fees !== null && <span>Activities: KES {s.activity_fees.toLocaleString()}</span>}
                </div>
                {s.other_fees && Object.keys(s.other_fees).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(s.other_fees).map(([key, val]) => (
                      <span
                        key={key}
                        className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-800/50 border border-slate-700/30 text-slate-400"
                      >
                        {key}: KES {Number(val).toLocaleString()}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
