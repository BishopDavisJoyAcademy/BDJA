"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getGradeLabel, formatDate } from "@/lib/utils";
import { DollarSign, Calendar, AlertCircle, Copy } from "lucide-react";
import toast from "react-hot-toast";

export default function ParentDashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: pc } = await supabase
        .from("parent_children")
        .select("*, students(*, classes(name, grade_level, stream), campuses(name))")
        .eq("parent_id", user!.id);
      setChildren(pc || []);

      if (pc && pc.length > 0) {
        setSelectedChild(pc[0]);
        const studentIds = pc.map((c) => c.student_id);

        const { data: feeData } = await supabase
          .from("fee_payments")
          .select("*, fee_structures(*), students(admission_number)")
          .in("student_id", studentIds)
          .order("created_at", { ascending: false })
          .limit(10);
        setFees(feeData || []);

        const { data: ev } = await supabase
          .from("calendar_events")
          .select("*")
          .or("target_audience.eq.all,target_audience.eq.parents")
          .gte("start_date", new Date().toISOString())
          .order("start_date")
          .limit(5);
        setEvents(ev || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyPaybill = (childName: string) => {
    const text = `MWITI22#${childName}`;
    navigator.clipboard.writeText(text);
    toast.success("Account number copied!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-600">No children linked</h2>
        <p className="text-gray-400 mt-2">Please contact the school administration.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-bdja-primary to-bdja-accent rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Parent Portal</h1>
        <p className="text-white/80 mt-1">Welcome back, {user?.full_name}</p>
      </div>

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {children.map((c) => (
            <button
              key={c.student_id}
              onClick={() => setSelectedChild(c)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedChild?.student_id === c.student_id
                  ? "bg-bdja-primary text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {c.students.classes.name}
            </button>
          ))}
        </div>
      )}

      {selectedChild && (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-bdja-dark">{selectedChild.students.classes.name}</h2>
                  <p className="text-gray-500">{getGradeLabel(selectedChild.students.classes.grade_level)} - {selectedChild.students.campuses.name}</p>
                  <p className="text-sm text-gray-400 mt-1">Admission: {selectedChild.students.admission_number}</p>
                </div>
                <div className="text-right">
                  <div className="bg-green-50 rounded-xl px-4 py-2">
                    <p className="text-xs text-green-600 font-medium">Status</p>
                    <p className="text-sm font-semibold text-green-700 capitalize">{selectedChild.students.status}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-bdja-primary" />
                Fee Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm font-medium text-gray-700">HFC Bank Paybill</p>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-2xl font-bold text-bdja-dark">100400</p>
                    <p className="text-xs text-gray-500">Account: MWITI22#{selectedChild.students.classes.name.replace(/\s/g, "")}</p>
                  </div>
                  <button
                    onClick={() => copyPaybill(selectedChild.students.classes.name.replace(/\s/g, ""))}
                    className="flex items-center gap-1.5 px-3 py-2 bg-bdja-primary text-white rounded-lg text-sm hover:bg-bdja-accent transition-colors"
                  >
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-800">M-Pesa STK Push</p>
                <p className="text-xs text-blue-600 mt-1">Coming Soon - Notify me when available</p>
              </div>

              {fees.filter((f) => f.student_id === selectedChild.student_id).length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Payment History</p>
                  <div className="space-y-2">
                    {fees
                      .filter((f) => f.student_id === selectedChild.student_id)
                      .map((fee) => (
                        <div key={fee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">KES {fee.amount.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{formatDate(fee.created_at)}</p>
                          </div>
                          <Badge variant={fee.status === "verified" ? "success" : fee.status === "pending" ? "warning" : "danger"}>
                            {fee.status}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-bdja-primary" />
            School Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No upcoming events.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="p-3 border border-gray-100 rounded-lg">
                  <p className="font-medium text-sm">{event.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(event.start_date)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
