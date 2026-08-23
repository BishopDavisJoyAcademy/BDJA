"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Users, Calendar, CheckCircle, XCircle, Clock, Loader2, AlertCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  subject_name?: string;
  remarks?: string;
}

export default function ParentAttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0 });

  useEffect(() => {
    async function fetchAttendance() {
      try {
        const res = await fetch("/api/attendance");
        if (!res.ok) throw new Error("Failed to fetch attendance");
        const data = await res.json();
        const recs = data.records || data.attendance || [];
        setRecords(recs);
        const s = { present: 0, absent: 0, late: 0, excused: 0 };
        recs.forEach((r: AttendanceRecord) => {
          if (r.status in s) s[r.status as keyof typeof s]++;
        });
        setStats(s);
      } catch (err: unknown) {
        setError(getErrorMessage(err) || "Could not load attendance");
      } finally {
        setLoading(false);
      }
    }
    fetchAttendance();
  }, []);

  const getIcon = (status: string) => {
    switch (status) {
      case "present": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "absent": return <XCircle className="w-5 h-5 text-red-500" />;
      case "late": return <Clock className="w-5 h-5 text-yellow-500" />;
      case "excused": return <Calendar className="w-5 h-5 text-blue-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "present": return "text-green-600 bg-green-50 border-green-200";
      case "absent": return "text-red-600 bg-red-50 border-red-200";
      case "late": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "excused": return "text-blue-600 bg-blue-50 border-blue-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Child Attendance</h1>
        <p className="text-gray-500">Track your child's attendance records</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Present", value: stats.present, color: "text-green-600 bg-green-50" },
          { label: "Absent", value: stats.absent, color: "text-red-600 bg-red-50" },
          { label: "Late", value: stats.late, color: "text-yellow-600 bg-yellow-50" },
          { label: "Excused", value: stats.excused, color: "text-blue-600 bg-blue-50" },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 rounded-xl ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {records.length === 0 && !error && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No attendance records found</h3>
          <p className="text-gray-400 mt-1">Records will appear once attendance is taken.</p>
        </div>
      )}

      <div className="space-y-3">
        {records.map((record) => (
          <div key={record.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            {getIcon(record.status)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 capitalize">{record.status}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize border ${getStatusStyle(record.status)}`}>
                  {record.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {new Date(record.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {record.subject_name && (
                <p className="text-xs text-gray-400 mt-0.5">{record.subject_name}</p>
              )}
            </div>
            {record.remarks && (
              <p className="text-sm text-gray-400 max-w-[200px] text-right truncate">
                {record.remarks}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
