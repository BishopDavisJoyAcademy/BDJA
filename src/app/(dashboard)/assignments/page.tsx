"use client";

import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { ClipboardList } from "lucide-react";

export default function AssignmentsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <p className="text-gray-500">View and manage assignments</p>
      </div>
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <ClipboardList className="w-5 h-5 text-bdja-primary" />
          <span className="font-medium">Assignment List</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">Assignments will appear here.</p>
      </Card>
    </div>
  );
}
