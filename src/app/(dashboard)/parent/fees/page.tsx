"use client";

import { useParentContext } from "@/contexts/ParentContext";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { Wallet, Loader2, Copy, Check, Phone, Receipt, AlertCircle, ExternalLink } from "lucide-react";

const GOLD = "#D4AF37";

interface Payment { id: string; amount: number; status: string; payment_method: string | null; receipt_number: string | null; created_at: string; }

export default function ParentFees() {
  const { selectedChild } = useParentContext();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [feeStructure, setFeeStructure] = useState<Record<string, unknown> | null>(null);
  const [totalPaid, setTotalPaid] = useState(0);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchFees = useCallback(async () => {
    if (!selectedChild) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
      const res = await fetch(`/api/parent/fees?child_id=${selectedChild.student_id}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch fees");
      const data = await res.json();
      setPayments(data.payments || []);
      setFeeStructure(data.fee_structure || null);
      setTotalPaid(data.total_paid || 0);
      setBalance(data.balance || 0);
    } catch (err: unknown) { toast.error(getErrorMessage(err)); } finally { setLoading(false); }
  }, [selectedChild]);

  useEffect(() => { fetchFees(); }, [fetchFees]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(null), 2000);
  };

  const accountNumber = selectedChild ? `MWITI22#${selectedChild.full_name.replace(/\s+/g, "")}` : "";
  const payBillNumber = "100400";

  if (!selectedChild) return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <Wallet className="w-16 h-16 text-slate-700 mb-4" />
      <h2 className="text-xl font-semibold text-white mb-2">Select a Child</h2>
      <p className="text-slate-400 text-sm">Choose a child to view fee information.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">School Fees</h1>
        <p className="text-slate-400 text-sm mt-1">{selectedChild.full_name} · {selectedChild.class_name}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Expected</p>
          <p className="text-2xl font-bold text-white mt-1">KES {((feeStructure?.total as number) || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total Paid</p>
          <p className="text-2xl font-bold text-green-400 mt-1">KES {totalPaid.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Balance</p>
          <p className={`text-2xl font-bold mt-1 ${balance > 0 ? "text-red-400" : "text-green-400"}`}>KES {balance.toLocaleString()}</p>
        </div>
      </div>
      <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#D4AF3715", border: "1px solid #D4AF3730" }}>
            <Receipt className="w-5 h-5" style={{ color: GOLD }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">HFC Bank Payment Details</h3>
            <p className="text-xs text-slate-500">Pay via M-Pesa or HFC Bank</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
            <p className="text-xs text-slate-500 mb-1">M-Pesa PayBill Number</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xl font-bold text-white tracking-wider">{payBillNumber}</p>
              <button onClick={() => copyToClipboard(payBillNumber, "PayBill")} className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                {copied === "PayBill" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>
          <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
            <p className="text-xs text-slate-500 mb-1">Account Number</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-white truncate">{accountNumber}</p>
              <button onClick={() => copyToClipboard(accountNumber, "Account")} className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors shrink-0">
                {copied === "Account" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mb-6">
          <a href="tel:*334#" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90" style={{ background: "#D4AF37", color: "#0f172a" }}>
            <Phone className="w-4 h-4" />Open M-Pesa (*334#)
          </a>
          <a href="https://hfcb.co.ke/hfcb-whizz" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-600/50 transition-all">
            <ExternalLink className="w-4 h-4" />HFC Whizz App
          </a>
        </div>
        <div className="rounded-xl bg-slate-800/30 border border-slate-700/20 p-4">
          <h4 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">How to Pay via M-Pesa</h4>
          <ol className="space-y-2.5">
            {["Open your phone dialer and dial *334# (or open M-Pesa app)","Select Lipa na M-Pesa","Select PayBill",`Enter Business Number: ${payBillNumber}`,`Enter Account Number: ${accountNumber}`,"Enter the amount you wish to pay","Enter your M-Pesa PIN and confirm","You will receive an SMS confirmation from M-Pesa"].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5" style={{ background: "#D4AF3720", color: GOLD }}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 pt-3 border-t border-slate-700/20 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">Keep your M-Pesa transaction SMS as proof of payment. Free for amounts up to KES 100. Standard Safaricom M-Pesa fees apply for higher amounts.</p>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} /></div>
      ) : payments.length > 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Payment History</h3>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/20">
                <div>
                  <p className="text-sm font-medium text-white">KES {p.amount.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{p.payment_method || "M-Pesa"} · {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${p.status === "paid" ? "bg-green-500/10 text-green-400 border border-green-500/20" : p.status === "pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>{p.status}</span>
                  {p.receipt_number && <p className="text-[10px] text-slate-500 mt-1">Ref: {p.receipt_number}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-8 text-center">
          <Receipt className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-white mb-1">No Payment History</h3>
          <p className="text-xs text-slate-500">No payments have been recorded yet.</p>
        </div>
      )}
    </div>
  );
}
