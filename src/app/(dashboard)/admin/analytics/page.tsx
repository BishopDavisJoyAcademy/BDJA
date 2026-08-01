"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BarChart3, Users, GraduationCap, DollarSign, TrendingUp } from "lucide-react";

interface FeePayment { amount: number; }
interface AttendanceRecord { status: string; }

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalFees: 0,
    avgAttendance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const { count: students } = await supabase.from("students").select("*", { count: "exact", head: true });
    const { count: teachers } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher");
    const { count: parents } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "parent");

    const { data: feesRaw } = await supabase.from("fee_payments").select("amount").eq("status", "verified");
    const fees = (feesRaw || []) as FeePayment[];
    const totalFees = fees.reduce((s, f) => s + (f.amount || 0), 0);

    const today = new Date().toISOString().split("T")[0];
    const { data: attRaw } = await supabase.from("attendance").select("status").eq("date", today);
    const att = (attRaw || []) as AttendanceRecord[];
    const presentCount = att.filter((a) => a.status === "present").length;
    const avgAttendance = att.length > 0 ? Math.round((presentCount / att.length) * 100) : 0;

    setStats({ totalStudents: students || 0, totalTeachers: teachers || 0, totalParents: parents || 0, totalFees, avgAttendance });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-bdja-dark">Analytics Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">School-wide metrics and insights</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{stats.totalStudents}</p>
                <p className="text-xs text-gray-500">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{stats.totalTeachers}</p>
                <p className="text-xs text-gray-500">Teachers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{stats.totalParents}</p>
                <p className="text-xs text-gray-500">Parents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-bdja-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">KES {(stats.totalFees / 1000).toFixed(0)}k</p>
                <p className="text-xs text-gray-500">Fees Collected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{stats.avgAttendance}%</p>
                <p className="text-xs text-gray-500">Today's Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
