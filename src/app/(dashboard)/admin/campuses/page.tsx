"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Building2, Plus, MapPin, Phone, Loader2 } from "lucide-react";

interface Campus {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  headteacher_id: string | null;
  is_active: boolean;
}

export default function CampusesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && user?.role !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === "admin") fetchCampuses();
  }, [user]);

  async function fetchCampuses() {
    try {
      setFetching(true);
      const res = await fetch("/api/admin/campuses");
      const data = await res.json();
      setCampuses(data.campuses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-bdja-primary animate-spin" />
      </div>
    );
  }

  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campus Management</h1>
          <p className="text-gray-500">Manage school campuses and locations</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Campus
        </button>
      </div>

      <Card className="p-6">
        {fetching ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : campuses.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No campuses configured.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campuses.map((c) => (
              <div key={c.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{c.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{c.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
                {c.address && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.address}</p>}
                {c.phone && <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {c.phone}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
