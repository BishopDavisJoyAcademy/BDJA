"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Users, GraduationCap, DollarSign, BookOpen, ClipboardList,
  Calendar, BarChart3, Shield, Plus, TrendingUp, AlertCircle,
  FileText, MapPin, Settings
} from "lucide-react";
import Link from "next/link";

interface FeePayment { amount: number; }
interface AdmissionRecord { id: string; first_name: string; last_name: string; grade_applied: string; status: string; created_at: string; }
interface PaymentRecord { id: string; amount: number; status: string; created_at: string; students?: { admission_number: string }; }
interface CalendarEvent { id: string; title: string; start_date: string; event_type: string; }

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0, totalTeachers: 0, totalParents: 0, totalFees: 0,
    pendingAdmissions: 0, pendingFees: 0,
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
        totalStudents: students || 0, totalTeachers: teachers || 0, totalParents: parents || 0,
        totalFees, pendingAdmissions: pendingAdm || 0, pendingFees: pendingFee || 0,
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
          <div className="hidden md:flex items-center gap-2">
            <Link href="/admin/content">
              <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
                <FileText className="w-4 h-4 mr-1" /> Content
              </Button>
            </Link>
            <Link href="/admin/campuses">
              <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
                <MapPin className="w-4 h-4 mr-1" /> Campuses
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-2xl font-bold text-bdja-dark">{stats.totalStudents}</p><p className="text-xs text-gray-500">Students</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><GraduationCap className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-2xl font-bold text-bdja-dark">{stats.totalTeachers}</p><p className="text-xs text-gray-500">Teachers</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-purple-600" /></div>
              <div><p className="text-2xl font-bold text-bdja-dark">{stats.totalParents}</p><p className="text-xs text-gray-500">Parents</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5 text-orange-600" /></div>
              <div><p className="text-2xl font-bold text-bdja-dark">KES {stats.totalFees.toLocaleString()}</p><p className="text-xs text-gray-500">Fees Collected</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/users">
          <Card className="card-hover p-4 flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-bdja-primary/10 rounded-lg flex items-center justify-center"><Shield className="w-5 h-5 text-bdja-primary" /></div>
            <div><p className="font-medium text-sm text-bdja-dark">Manage Users</p><p className="text-xs text-gray-500">Add/edit students, staff</p></div>
          </Card>
        </Link>
        <Link href="/admin/content">
          <Card className="card-hover p-4 flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-bdja-primary/10 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-bdja-primary" /></div>
            <div><p className="font-medium text-sm text-bdja-dark">Content Manager</p><p className="text-xs text-gray-500">Homepage, news, notices</p></div>
          </Card>
        </Link>
        <Link href="/admin/campuses">
          <Card className="card-hover p-4 flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-bdja-primary/10 rounded-lg flex items-center justify-center"><MapPin className="w-5 h-5 text-bdja-primary" /></div>
            <div><p className="font-medium text-sm text-bdja-dark">Campuses</p><p className="text-xs text-gray-500">Manage school locations</p></div>
          </Card>
        </Link>
        <Link href="/admin/analytics">
          <Card className="card-hover p-4 flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-bdja-primary/10 rounded-lg flex items-center justify-center"><BarChart3 className="w-5 h-5 text-bdja-primary" /></div>
            <div><p className="font-medium text-sm text-bdja-dark">Analytics</p><p className="text-xs text-gray-500">Reports & insights</p></div>
          </Card>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><AlertCircle className="w-4 h-4 text-bdja-secondary" /> Pending Admissions ({stats.pendingAdmissions})</CardTitle>
            <Link href="/admissions"><Button size="sm" variant="outline">View All</Button></Link>
          </CardHeader>
          <CardContent>
            {recentAdmissions.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No pending admissions.</p>
            ) : (
              <div className="space-y-2">
                {recentAdmissions.map((adm) => (
                  <div key={adm.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-sm text-bdja-dark">{adm.first_name} {adm.last_name}</p>
                      <p className="text-xs text-gray-500">Grade {adm.grade_applied} &middot; {new Date(adm.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={adm.status === "received" ? "warning" : "success"} className="text-xs">{adm.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-bdja-secondary" /> Recent Payments</CardTitle>
            <Link href="/fees"><Button size="sm" variant="outline">View All</Button></Link>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No recent payments.</p>
            ) : (
              <div className="space-y-2">
                {recentPayments.map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-sm text-bdja-dark">KES {pay.amount?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{pay.students?.admission_number || "N/A"} &middot; {new Date(pay.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={pay.status === "verified" ? "success" : "warning"} className="text-xs">{pay.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold flex items-center gap-2"><Calendar className="w-4 h-4 text-bdja-secondary" /> Upcoming Events</CardTitle></CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No upcoming events.</p>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="w-8 h-8 bg-bdja-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-bdja-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-bdja-dark">{ev.title}</p>
                    <p className="text-xs text-gray-500">{new Date(ev.start_date).toLocaleDateString()} &middot; {ev.event_type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
