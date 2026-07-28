"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Library, BookOpen, Users, AlertCircle, Search, Plus } from "lucide-react";
import Link from "next/link";

export default function LibrarianDashboard() {
  const { user } = useAuth();
  const [resources, setResources] = useState<any[]>([]);
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: res } = await supabase
        .from("library_resources")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setResources(res || []);

      const { data: bor } = await supabase
        .from("library_borrowings")
        .select("*, library_resources(title), students(admission_number)")
        .eq("status", "borrowed")
        .order("due_date");
      setBorrowings(bor || []);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter((r) =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.author?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const overdueCount = borrowings.filter((b) => new Date(b.due_date) < new Date()).length;

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
        <h1 className="text-2xl font-bold">Library Portal</h1>
        <p className="text-white/80 mt-1">Welcome back, {user?.full_name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Library className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{resources.length}</p>
                <p className="text-xs text-gray-500">Total Resources</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-bdja-dark">{borrowings.length}</p>
                <p className="text-xs text-gray-500">Borrowed</p>
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
                <p className="text-2xl font-bold text-bdja-dark">{overdueCount}</p>
                <p className="text-xs text-gray-500">Overdue</p>
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
                <p className="text-2xl font-bold text-bdja-dark">{resources.filter((r) => r.resource_type === "physical").length}</p>
                <p className="text-xs text-gray-500">Physical Books</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Library className="w-5 h-5 text-bdja-primary" />
                Library Catalog
              </CardTitle>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredResources.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No resources found.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {filteredResources.map((res) => (
                  <div key={res.id} className="p-4 border border-gray-100 rounded-xl hover:border-bdja-primary/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{res.title}</p>
                        <p className="text-xs text-gray-500">{res.author || "Unknown author"}</p>
                      </div>
                      <Badge variant={res.resource_type === "physical" ? "warning" : "info"}>{res.resource_type}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-gray-400">{res.available_copies} / {res.total_copies} available</p>
                      {res.resource_type === "physical" && (
                        <span className={`text-xs font-medium ${res.available_copies > 0 ? "text-green-600" : "text-red-600"}`}>
                          {res.available_copies > 0 ? "Available" : "Out of stock"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-bdja-primary" />
              Overdue Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {borrowings.filter((b) => new Date(b.due_date) < new Date()).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No overdue items.</p>
            ) : (
              <div className="space-y-3">
                {borrowings
                  .filter((b) => new Date(b.due_date) < new Date())
                  .map((b) => (
                    <div key={b.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                      <p className="font-medium text-sm text-red-800">{b.library_resources?.title}</p>
                      <p className="text-xs text-red-600">{b.students?.admission_number} - Due: {b.due_date}</p>
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
