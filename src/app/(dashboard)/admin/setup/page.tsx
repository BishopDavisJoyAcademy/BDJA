"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Settings, Wrench, Database, Shield, Loader2, CheckCircle } from "lucide-react";

interface SetupTask {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  icon: React.ReactNode;
}

export default function SetupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<SetupTask[]>([]);

  useEffect(() => {
    if (!loading && user?.role !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "admin") {
      setTasks([
        { id: "1", label: "Create Super Admin", description: "Set up the primary administrator account", completed: true, icon: <Shield className="w-5 h-5" /> },
        { id: "2", label: "Configure Campuses", description: "Add school campuses and locations", completed: false, icon: <Database className="w-5 h-5" /> },
        { id: "3", label: "Add Subjects", description: "Define academic subjects and curricula", completed: false, icon: <Wrench className="w-5 h-5" /> },
        { id: "4", label: "Import Students", description: "Bulk import student records", completed: false, icon: <Settings className="w-5 h-5" /> },
        { id: "5", label: "Configure VORA", description: "Set up AI-powered learning content", completed: false, icon: <CheckCircle className="w-5 h-5" /> },
      ]);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-bdja-primary animate-spin" />
      </div>
    );
  }

  if (user?.role !== "admin") return null;

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Setup</h1>
        <p className="text-gray-500">Complete these steps to fully configure BDJA</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500">Setup Progress</p>
            <p className="text-2xl font-bold text-gray-900">{completedCount} / {tasks.length} completed</p>
          </div>
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${(completedCount / tasks.length) * 100}%` }} />
          </div>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className={`flex items-center gap-4 p-4 border rounded-lg ${task.completed ? "border-green-200 bg-green-50" : "border-gray-100 hover:bg-gray-50"}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${task.completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"}`}>
                {task.completed ? <CheckCircle className="w-5 h-5" /> : task.icon}
              </div>
              <div className="flex-1">
                <h4 className={`font-medium ${task.completed ? "text-green-800" : "text-gray-900"}`}>{task.label}</h4>
                <p className={`text-xs ${task.completed ? "text-green-600" : "text-gray-500"}`}>{task.description}</p>
              </div>
              {task.completed ? (
                <span className="text-xs font-medium text-green-700">Done</span>
              ) : (
                <button className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">Start</button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
