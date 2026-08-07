"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GraduationCap, Wallet, UserCheck, Calendar, Bell } from "lucide-react";

interface ParentData {
  grades: any[];
  fees: any[];
  attendance: any[];
  announcements: any[];
}

export default function StudentParentView() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ParentData>({ grades: [], fees: [], attendance: [], announcements: [] });
  const [activeTab, setActiveTab] = useState("grades");

  useEffect(() => {
    if (!loading && user?.user_category !== "student" && user?.user_category !== "parent") {
      router.push("/unauthorized");
      return;
    }
    if (user) {
      fetchParentData();
    }
  }, [user, loading, router]);

  const fetchParentData = async () => {
    try {
      const [gradesRes, feesRes, announcementsRes] = await Promise.all([
        fetch("/api/parent/grades"),
        fetch("/api/parent/fees"),
        fetch("/api/parent/announcements"),
      ]);

      const grades = gradesRes.ok ? await gradesRes.json() : { grades: [] };
      const fees = feesRes.ok ? await feesRes.json() : { fees: [] };
      const announcements = announcementsRes.ok ? await announcementsRes.json() : { announcements: [] };

      setData({
        grades: grades.grades || [],
        fees: fees.fees || [],
        attendance: [],
        announcements: announcements.announcements || [],
      });
    } catch (err) {
      console.error("Failed to fetch parent data:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { key: "grades", label: "Academic Reports", icon: GraduationCap },
    { key: "fees", label: "Fee Balance", icon: Wallet },
    { key: "attendance", label: "Attendance", icon: UserCheck },
    { key: "announcements", label: "Announcements", icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parent Information</h1>
        <p className="text-gray-500">View your child's academic and school information</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-bdja-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "grades" && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-bdja-primary" />
            Academic Reports
          </h3>
          {data.grades.length === 0 ? (
            <p className="text-gray-500 text-sm">No grades available yet.</p>
          ) : (
            <div className="space-y-3">
              {data.grades.map((g: any, i: number) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{g.subjects?.name || "Subject"}</p>
                    <p className="text-xs text-gray-500">{g.strand} - {g.sub_strand}</p>
                  </div>
                  <Badge variant={g.performance_level === "exceeds" ? "success" : "default"}>
                    {g.performance_level}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "fees" && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-bdja-primary" />
            Fee Balance
          </h3>
          {data.fees.length === 0 ? (
            <p className="text-gray-500 text-sm">No fee records found.</p>
          ) : (
            <div className="space-y-3">
              {data.fees.map((f: any, i: number) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{f.term} - {f.academic_year}</p>
                    <p className="text-xs text-gray-500">Balance: KES {f.balance}</p>
                  </div>
                  <Badge variant={f.status === "paid" ? "success" : f.status === "partial" ? "warning" : "destructive"}>
                    {f.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === "attendance" && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-bdja-primary" />
            Attendance
          </h3>
          <p className="text-gray-500 text-sm">Attendance records will appear here.</p>
        </Card>
      )}

      {activeTab === "announcements" && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-bdja-primary" />
            Announcements
          </h3>
          {data.announcements.length === 0 ? (
            <p className="text-gray-500 text-sm">No announcements at this time.</p>
          ) : (
            <div className="space-y-3">
              {data.announcements.map((a: any, i: number) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{a.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(a.start_date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
