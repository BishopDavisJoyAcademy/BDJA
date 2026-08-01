"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import {
  Users, GraduationCap, DollarSign, BookOpen, ClipboardList,
  Calendar, BarChart3, Shield, Plus, TrendingUp, AlertCircle
} from "lucide-react";
import Link from "next/link";

interface FeePayment { amount: number; }
interface AdmissionRecord { id: string; first_name: string; last_name: string; grade_applied: string; status: string; created_at: string; }
interface PaymentRecord { id: string; amount: number; status: string; created_at: string; students?: { admission_number: string }; }
interface CalendarEvent { id: string; title: string; start_date: string; event_type: string; }

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalFees: 0,
    pendingAdmissions: 0,
    pendingFees: 0,
  });
  const [recentAdmissions, setRecentAdmissions] = useState<AdmissionRecord[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentRecord[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { count: students } = await supabase.from("students").select("*", { count: "exact", head: true });
      const { count: teachers } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher");
      const { count: parents } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "parent");
      const { count: pendingAdm } = await supabase.from("admissions").select("*", { count: "exact", head: true }).eq("status", "received");
      const { count: pendingFee } = await supabase.from("fee_payments").select("*", { count: "exact", head: true }).eq("status", "pending");

      const { data: feesRaw } = await supabase.from("fee_payments").select("amount").eq("status", "verified");
      const fees = (feesRaw || []) as FeePayment[];
      const totalFees = fees.reduce((sum, f) => sum + (f.amount || 0), 0);

      setStats({
        totalStudents: students || 0,
        totalTeachers: teachers || 0,
        totalParents: parents || 0,
        totalFees,
        pendingAdmissions: pendingAdm || 0,
        pendingFees: pendingFee || 0,
      });

      const { data: adm } = await supabase.from("admissions").select("*").order("created_at", { ascending: false }).limit(5);
      setRecentAdmissions((adm || []) as AdmissionRecord[]);

      const { data: pay } = await supabase.from("fee_payments").select("*, students(admission_number)").order("created_at", { ascending: false }).limit(5);
      setRecentPayments((pay || []) as PaymentRecord[]);

      const { data: ev } = await supabase.from("calendar_events").select("*").gte("start_date", new Date().toISOString()).order("start_date").limit(5);
      setEvents((ev || []) as CalendarEvent[]);
    } finally {
      setLoading(false);
    }
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
      <div className="bg-gradient-to-r from-bdja-primary to-bdja-accent rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Portal</h1>
            <p className="text-white/80 mt-1">Welcome back, {user?.full_name}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
            <Shield className="w-5 h-5 text-bdja-secondary" />
            <span className="text-sm font-medium">{user?.role.replace("_", " ").toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                <ClipboardList className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{stats.pendingAdmissions}</p>
                <p className="text-xs text-gray-500">Pending Admissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{stats.pendingFees}</p>
                <p className="text-xs text-gray-500">Pending Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-bdja-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/users">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Users className="w-4 h-4 mr-2" /> Manage Users
              </Button>
            </Link>
            <Link href="/admissions">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <ClipboardList className="w-4 h-4 mr-2" /> Admissions
              </Button>
            </Link>
            <Link href="/timetable">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Calendar className="w-4 h-4 mr-2" /> Edit Timetable
              </Button>
            </Link>
            <Link href="/calendar">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Calendar className="w-4 h-4 mr-2" /> Calendar Events
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" /> Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-bdja-primary" />
                Recent Admissions
              </CardTitle>
              <Link href="/admissions" className="text-sm text-bdja-primary hover:underline">View All</Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentAdmissions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No admissions yet.</p>
            ) : (
              <div className="space-y-3">
                {recentAdmissions.map((adm) => (
                  <div key={adm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{adm.first_name} {adm.last_name}</p>
                      <p className="text-xs text-gray-500">Grade: {adm.grade_applied}</p>
                    </div>
                    <Badge variant={adm.status === "received" ? "warning" : "success"}>{adm.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
