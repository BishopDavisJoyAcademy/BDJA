"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getGradeLabel, getDayName, formatDate, formatTime } from "@/lib/utils";
import {
  BookOpen, Calendar, Clock, GraduationCap, Award, TrendingUp,
  MessageSquare, AlertCircle, CheckCircle, Clock3
} from "lucide-react";
import Link from "next/link";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get student record
      const { data: studentData } = await supabase
        .from("students")
        .select("*, classes(name, grade_level, stream), campuses(name)")
        .eq("profile_id", user!.id)
        .single();
      setStudent(studentData);

      if (studentData) {
        const today = new Date().getDay();

        // Timetable for today
        const { data: tt } = await supabase
          .from("timetable")
          .select("*, subjects(name)")
          .eq("class_id", studentData.class_id)
          .eq("day_of_week", today)
          .order("start_time");
        setTimetable(tt || []);

        // Assignments
        const { data: ass } = await supabase
          .from("assignments")
          .select("*, subjects(name)")
          .eq("class_id", studentData.class_id)
          .eq("status", "published")
          .order("due_date", { ascending: true })
          .limit(5);
        setAssignments(ass || []);

        // Grades
        const { data: gr } = await supabase
          .from("assessments")
          .select("*, subjects(name)")
          .eq("student_id", studentData.id)
          .order("created_at", { ascending: false })
          .limit(5);
        setGrades(gr || []);

        // Events
        const { data: ev } = await supabase
          .from("calendar_events")
          .select("*")
          .or(`target_audience.eq.all,target_audience.eq.students,target_grade.eq.${studentData.classes.grade_level}`)
          .gte("start_date", new Date().toISOString())
          .order("start_date")
          .limit(5);
        setEvents(ev || []);

        // Attendance
        const { data: att } = await supabase
          .from("attendance")
          .select("status")
          .eq("student_id", studentData.id)
          .eq("date", new Date().toISOString().split("T")[0]);
        setAttendance(att?.[0] || null);

        // Study streak
        const { data: stk } = await supabase
          .from("study_streaks")
          .select("*")
          .eq("student_id", studentData.id)
          .single();
        setStreak(stk);
      }
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

  if (!student) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-600">Student record not found</h2>
        <p className="text-gray-400 mt-2">Please contact your administrator.</p>
      </div>
    );
  }

  const today = new Date().getDay();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-bdja-primary to-bdja-accent rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.full_name.split(" ")[0]}!</h1>
            <p className="text-white/80 mt-1">
              {student.classes.name} • {getGradeLabel(student.classes.grade_level)} {student.classes.stream ? `• ${student.classes.stream}` : ""}
            </p>
            <p className="text-white/60 text-sm mt-0.5">{student.campuses.name}</p>
          </div>
          <div className="text-right">
            {streak && (
              <div className="bg-white/10 rounded-xl px-4 py-2">
                <p className="text-2xl font-bold">{streak.current_streak}</p>
                <p className="text-xs text-white/70">Day Streak</p>
              </div>
            )}
          </div>
        </div>
        {attendance && (
          <div className="mt-4 inline-flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm">Marked {attendance.status} today</span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{assignments.length}</p>
                <p className="text-xs text-gray-500">Pending Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{grades.length}</p>
                <p className="text-xs text-gray-500">Recent Assessments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{events.length}</p>
                <p className="text-xs text-gray-500">Upcoming Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-bdja-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{streak?.current_streak || 0}</p>
                <p className="text-xs text-gray-500">Study Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Timetable */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-bdja-primary" />
                Today's Timetable — {getDayName(today)}
              </CardTitle>
              <Link href="/timetable" className="text-sm text-bdja-primary hover:underline">View Full</Link>
            </div>
          </CardHeader>
          <CardContent>
            {timetable.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No classes scheduled for today.</p>
            ) : (
              <div className="space-y-3">
                {timetable.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-bdja-primary w-20">
                      {formatTime(item.start_time)} - {formatTime(item.end_time)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.subjects.name}</p>
                      {item.topic && <p className="text-xs text-gray-500">{item.topic}</p>}
                    </div>
                    {item.room && (
                      <Badge variant="info">Room {item.room}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-bdja-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No upcoming events.</p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="p-3 border border-gray-100 rounded-lg">
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(event.start_date)}</p>
                    <Badge variant={
                      event.event_type === "examination" ? "danger" :
                      event.event_type === "sports" ? "success" :
                      event.event_type === "religious" ? "warning" : "info"
                    } className="mt-2">
                      {event.event_type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-bdja-primary" />
              Assignments
            </CardTitle>
            <Link href="/assignments" className="text-sm text-bdja-primary hover:underline">View All</Link>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No pending assignments.</p>
          ) : (
            <div className="space-y-3">
              {assignments.map((ass) => (
                <div key={ass.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{ass.title}</p>
                    <p className="text-xs text-gray-500">{ass.subjects.name}</p>
                  </div>
                  <div className="text-right">
                    {ass.due_date && (
                      <p className="text-xs text-gray-500">
                        Due {formatDate(ass.due_date)}
                      </p>
                    )}
                    <Badge variant="warning" className="mt-1">Pending</Badge>
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
