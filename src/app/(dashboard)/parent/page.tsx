"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  GraduationCap, DollarSign, Calendar, Bell, Users, BookOpen,
  ChevronRight, Loader2, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

interface Child {
  id: string;
  full_name: string;
  email: string;
  students?: {
    admission_number?: string;
    grade_level?: string;
    status?: string;
  }[];
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  audience: string[];
}

export default function ParentDashboard() {
  const [children, setChildren] = useState<Child[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [childrenRes, annRes] = await Promise.all([
        fetch("/api/parent/children"),
        fetch("/api/parent/announcements"),
      ]);
      const childrenData = await childrenRes.json();
      const annData = await annRes.json();

      if (childrenRes.ok) {
        setChildren(childrenData.children || []);
        if (childrenData.children?.length > 0) {
          setSelectedChild(childrenData.children[0]);
        }
      }
      if (annRes.ok) setAnnouncements(annData.announcements || []);
    } catch (err: any) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-bdja-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
        <p className="text-sm text-gray-500">Monitor your child&apos;s academic progress and school updates</p>
      </div>

      {children.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">No Children Linked</h3>
            <p className="text-sm text-amber-700 mt-1">
              Your account is not linked to any students. Please contact the school administration to link your child.
            </p>
          </div>
        </div>
      )}

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedChild?.id === child.id
                  ? "bg-bdja-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {child.full_name}
            </button>
          ))}
        </div>
      )}

      {selectedChild && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href={`/parent/grades?child=${selectedChild.id}`}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-bdja-primary transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 mt-3">Academic Reports</h3>
              <p className="text-xs text-gray-500 mt-1">View grades and progress</p>
            </Card>
          </Link>

          <Link href={`/parent/fees?child=${selectedChild.id}`}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-bdja-primary transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 mt-3">Fee Balance</h3>
              <p className="text-xs text-gray-500 mt-1">Check payments and dues</p>
            </Card>
          </Link>

          <Link href={`/parent/attendance?child=${selectedChild.id}`}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-bdja-primary transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 mt-3">Attendance</h3>
              <p className="text-xs text-gray-500 mt-1">Daily attendance records</p>
            </Card>
          </Link>

          <Link href={`/parent/timetable?child=${selectedChild.id}`}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-bdja-primary transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 mt-3">Timetable</h3>
              <p className="text-xs text-gray-500 mt-1">Class schedule</p>
            </Card>
          </Link>
        </div>
      )}

      {/* Announcements */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-bdja-primary" />
          <h2 className="text-lg font-semibold text-gray-900">School Announcements</h2>
        </div>
        {announcements.length === 0 ? (
          <p className="text-sm text-gray-500">No announcements at this time.</p>
        ) : (
          <div className="space-y-3">
            {announcements.slice(0, 5).map((ann) => (
              <div key={ann.id} className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 text-sm">{ann.title}</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ann.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(ann.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
