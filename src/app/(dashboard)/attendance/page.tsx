"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { UserCheck, Calendar, Clock, Loader2 } from "lucide-react";

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: string;
  notes: string | null;
  marked_by: string;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) fetchAttendance();
  }, [user]);

  async function fetchAttendance() {
    try {
      setFetching(true);
      const res = await fetch("/api/attendance");
      const data = await res.json();
      setRecords(data.attendance || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }

  const statusColors: Record<string, string> = {
    present: "bg-green-100 text-green-700",
    absent: "bg-red-100 text-red-700",
    late: "bg-yellow-100 text-yellow-700",
    excused: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500">View attendance records</p>
      </div>

      <Card className="p-6">
        {fetching ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No attendance records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Class</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{new Date(r.date).toLocaleDateString("en-GB")}</td>
                    <td className="py-3 px-4 text-gray-600">{r.student_id}</td>
                    <td className="py-3 px-4 text-gray-600">{r.class_id}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status}</span></td>
                    <td className="py-3 px-4 text-gray-500">{r.notes || "—"}</td>
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
