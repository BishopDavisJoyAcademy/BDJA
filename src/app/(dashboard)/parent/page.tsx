"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Users, GraduationCap, Wallet, Calendar } from "lucide-react";
import Link from "next/link";

export default function ParentDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && user?.user_category !== "parent") {
      router.push("/unauthorized");
      return;
    }
    if (user?.user_category === "parent") {
      fetchChildren();
    }
  }, [user, loading, router]);

  const fetchChildren = async () => {
    try {
      const res = await fetch("/api/parent/children");
      if (res.ok) {
        const data = await res.json();
        setChildren(data.children || []);
      }
    } catch (err) {
      console.error("Failed to fetch children:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-bdja-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.user_category !== "parent") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
        <p className="text-gray-500">Welcome back, {user?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/parent/grades">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Academic Reports</h3>
                <p className="text-sm text-gray-500">View your children's grades</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/parent/fees">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Fee Balance</h3>
                <p className="text-sm text-gray-500">Check payment status</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/calendar">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">School Calendar</h3>
                <p className="text-sm text-gray-500">Upcoming events and holidays</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/messages">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Messages</h3>
                <p className="text-sm text-gray-500">Communicate with teachers</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {children.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">My Children</h2>
          <div className="space-y-3">
            {children.map((child: any) => (
              <div key={child.student_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {child.students?.profiles?.full_name || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Admission: {child.students?.admission_number || "N/A"}
                  </p>
                </div>
                <Link href={`/parent/grades?student=${child.student_id}`}>
                  <span className="text-sm text-bdja-primary hover:underline">View Grades</span>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
