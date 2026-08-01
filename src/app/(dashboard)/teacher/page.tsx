"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import {
  Users, BookOpen, ClipboardList, Calendar, BarChart3, Plus,
  CheckCircle, Clock, AlertCircle
} from "lucide-react";
import Link from "next/link";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<number>(0);
  const [pendingGrades, setPendingGrades] = useState<number>(0);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: classData } = await supabase
        .from("classes")
        .select("*, students(count)")
        .eq("class_teacher_id", user!.id);
      setClasses(classData || []);

      const { data: assData } = await supabase
        .from("assignments")
        .select("*")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setAssignments(assData || []);

      const today = new Date().toISOString().split("T")[0];
      const { count: attCount } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("marked_by", user!.id)
        .eq("date", today);
      setAttendanceToday(attCount || 0);

      const { data: ev } = await supabase
        .from("calendar_events")
        .select("*")
        .or("target_audience.eq.all,target_audience.eq.staff")
        .gte("start_date", new Date().toISOString())
        .order("start_date")
        .limit(5);
      setEvents(ev || []);
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
        <h1 className="text-2xl font-bold">Teacher Portal</h1>
        <p className="text-white/80 mt-1">Welcome back, {user?.full_name}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{classes.length}</p>
                <p className="text-xs text-gray-500">My Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{attendanceToday}</p>
                <p className="text-xs text-gray-500">Attendance Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{assignments.length}</p>
                <p className="text-xs text-gray-500">My Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{pendingGrades}</p>
                <p className="text-xs text-gray-500">Pending Grades</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My Classes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-bdja-primary" />
                My Classes
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No classes assigned yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {classes.map((cls) => (
                  <div key={cls.id} className="p-4 border border-gray-100 rounded-xl hover:border-bdja-primary/30 transition-colors">
                    <h3 className="font-semibold text-bdja-dark">{cls.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{cls.students?.[0]?.count || 0} students</p>
                    <div className="flex gap-2 mt-3">
                      <Link href={`/attendance?class=${cls.id}`}>
                        <Button variant="outline" size="sm">Attendance</Button>
                      </Link>
                      <Link href={`/grades?class=${cls.id}`}>
                        <Button variant="outline" size="sm">Grades</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-bdja-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/assignments/new">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <BookOpen className="w-4 h-4 mr-2" /> Create Assignment
              </Button>
            </Link>
            <Link href="/attendance">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <ClipboardList className="w-4 h-4 mr-2" /> Mark Attendance
              </Button>
            </Link>
            <Link href="/grades">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" /> Enter Grades
              </Button>
            </Link>
            <Link href="/vora/upload">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Users className="w-4 h-4 mr-2" /> Upload VORA Content
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-bdja-primary" />
              Recent Assignments
            </CardTitle>
            <Link href="/assignments" className="text-sm text-bdja-primary hover:underline">View All</Link>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No assignments created yet.</p>
          ) : (
            <div className="space-y-3">
              {assignments.map((ass) => (
                <div key={ass.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{ass.title}</p>
                    <p className="text-xs text-gray-500">{formatDate(ass.created_at)}</p>
                  </div>
                  <Badge variant={ass.status === "published" ? "success" : "warning"}>{ass.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
