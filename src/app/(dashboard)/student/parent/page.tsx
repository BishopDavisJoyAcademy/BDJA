"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Users, GraduationCap, Wallet, UserCheck, Loader2 } from "lucide-react";

interface Child {
  id: string;
  full_name: string;
  grade_level: string;
  admission_number: string;
}

export default function ParentPortal() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) fetchChildren();
  }, [user]);

  async function fetchChildren() {
    try {
      setFetching(true);
      const res = await fetch("/api/parent/children");
      const data = await res.json();
      setChildren(data.children || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
        <p className="text-gray-500">View your children's progress and school information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Children</p>
              <p className="text-xl font-bold text-gray-900">{children.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Grades</p>
              <p className="text-xl font-bold text-gray-900">View</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Fees</p>
              <p className="text-xl font-bold text-gray-900">View</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Attendance</p>
              <p className="text-xl font-bold text-gray-900">View</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Your Children</h3>
        {fetching ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : children.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No children linked to your account.</div>
        ) : (
          <div className="space-y-3">
            {children.map((child) => (
              <div key={child.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{child.full_name}</h4>
                  <p className="text-xs text-gray-500">Grade {child.grade_level} · Admission #{child.admission_number}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
