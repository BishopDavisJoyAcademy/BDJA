"use client";

import { useParentContext } from "@/contexts/ParentContext";
import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { UserCheck, Loader2, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

const GOLD = "#D4AF37";

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  present: { bg: "#22c55e15", text: "#22c55e", border: "#22c55e30" },
  absent: { bg: "#ef444415", text: "#ef4444", border: "#ef444430" },
  late: { bg: "#f59e0b15", text: "#f59e0b", border: "#f59e0b30" },
  excused: { bg: "#3b82f615", text: "#60a5fa", border: "#3b82f630" },
};

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  notes: string | null;
  subjects: { name: string } | null;
}

export default function ParentAttendance() {
  const { selectedChild } = useParentContext();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchAttendance = useCallback(async () => {
    if (!selectedChild) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const start = new Date(year, month, 1).toISOString().split("T")[0];
      const end = new Date(year, month + 1, 0).toISOString().split("T")[0];

      const res = await fetch(`/api/parent/attendance?child_id=${selectedChild.student_id}&start_date=${start}&end_date=${end}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch attendance");
      const data = await res.json();
      setRecords(data.attendance || []);
      setStats(data.stats || { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [selectedChild, currentMonth]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { day: number; dateStr: string; record: AttendanceRecord | null }[] = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: 0, dateStr: "", record: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const rec = records.find((r) => r.date === dateStr) || null;
      days.push({ day: d, dateStr, record: rec });
    }
    return days;
  }, [currentMonth, records]);

  const consecutiveAbsences = useMemo(() => {
    const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let maxStreak = 0;
    let currentStreak = 0;
    sorted.forEach((r) => {
      if (r.status.toLowerCase() === "absent") { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
      else { currentStreak = 0; }
    });
    return maxStreak;
  }, [records]);

  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });

  if (!selectedChild) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <UserCheck className="w-16 h-16 text-slate-700 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Select a Child</h2>
        <p className="text-slate-400 text-sm">Choose a child from the dropdown to view attendance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance Tracker</h1>
          <p className="text-slate-400 text-sm mt-1">{selectedChild.full_name} · {selectedChild.class_name}</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl border border-slate-700/50 p-1">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="px-3 text-sm font-medium text-white min-w-[140px] text-center">{monthName}</span>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Present", value: stats.present, color: "#22c55e" },
          { label: "Absent", value: stats.absent, color: "#ef4444" },
          { label: "Late", value: stats.late, color: "#f59e0b" },
          { label: "Excused", value: stats.excused, color: "#60a5fa" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {consecutiveAbsences >= 3 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-red-500/5 border border-red-500/15 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-200">{consecutiveAbsences} consecutive absences</p>
            <p className="text-xs text-red-300/60">Please contact the school if your child is unwell</p>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
        </div>
      ) : (
        <>
          {/* Calendar */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-xs text-slate-500 font-medium py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((d, i) => (
                <div key={i} className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm ${d.day === 0 ? "" : "bg-slate-800/30"}`}>
                  {d.day > 0 && (
                    <>
                      <span className="text-white font-medium">{d.day}</span>
                      {d.record && (
                        <div className="w-2 h-2 rounded-full mt-1" style={{ background: statusColors[d.record.status.toLowerCase()]?.text || "#D4AF37" }} />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-800/50">
              {Object.entries(statusColors).map(([status, colors]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: colors.text }} />
                  <span className="text-xs text-slate-400 capitalize">{status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Log */}
          {records.length > 0 && (
            <div className="rounded-2xl bg-slate-900/60 border border-slate-700/50 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Recent Attendance</h3>
              <div className="space-y-2">
                {records.slice(0, 10).map((r) => {
                  const colors = statusColors[r.status.toLowerCase()] || statusColors.present;
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors.text }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white capitalize">{r.status}</p>
                        {r.notes && <p className="text-xs text-slate-400 truncate">{r.notes}</p>}
                      </div>
                      <p className="text-xs text-slate-500 shrink-0">{new Date(r.date).toLocaleDateString()}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
