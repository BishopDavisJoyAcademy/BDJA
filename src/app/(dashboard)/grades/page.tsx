"use client";

import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { GraduationCap } from "lucide-react";

export default function GradesPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grades</h1>
        <p className="text-gray-500">View academic performance</p>
      </div>
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <GraduationCap className="w-5 h-5 text-bdja-primary" />
          <span className="font-medium">Academic Records</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">Grade data will appear here.</p>
      </Card>
    </div>
  );
}
