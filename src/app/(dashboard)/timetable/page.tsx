"use client";

import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Calendar } from "lucide-react";

export default function TimetablePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timetable</h1>
        <p className="text-gray-500">View your class schedule</p>
      </div>
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-bdja-primary" />
          <span className="font-medium">Weekly Timetable</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">Your timetable will appear here.</p>
      </Card>
    </div>
  );
}
