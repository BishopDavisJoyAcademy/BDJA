"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PenLine, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function MarkSheets() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && user?.user_category !== "staff" && user?.user_category !== "admin") {
      router.push("/unauthorized");
      return;
    }
    // Fetch students for marking
    setIsLoading(false);
  }, [user, loading, router]);

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "staff" && user?.user_category !== "admin") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mark Sheets</h1>
        <p className="text-gray-500">Enter and manage student grades</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <PenLine className="w-5 h-5 text-bdja-primary" />
          <span className="font-medium">Grade Entry</span>
        </div>
        <p className="text-gray-500 text-sm">Select a class and subject to begin entering grades.</p>
        <div className="mt-4 flex gap-3">
          <Select>
            <option>Select Class</option>
          </Select>
          <Select>
            <option>Select Subject</option>
          </Select>
          <Button className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Grades
          </Button>
        </div>
      </Card>
    </div>
  );
}
