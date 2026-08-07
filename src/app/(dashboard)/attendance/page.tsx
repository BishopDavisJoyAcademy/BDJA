"use client";

import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { UserCheck } from "lucide-react";

export default function AttendancePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-500">View attendance records</p>
      </div>
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <UserCheck className="w-5 h-5 text-bdja-primary" />
          <span className="font-medium">Attendance Records</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">Attendance data will appear here.</p>
      </Card>
    </div>
  );
}
