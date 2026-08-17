"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { User, MessageSquare, Send, Lightbulb, Bug, ThumbsUp, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface Suggestion {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
}

interface RelatedData {
  department: string | null;
  designation: string | null;
  grade_level: string | null;
  admission_number: string | null;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "feedback", title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [related, setRelated] = useState<RelatedData | null>(null);

  useEffect(() => {
    if (user) {
      fetchSuggestions();
      fetchRelatedData();
    }
  }, [user, fetchRelatedData]);

  const fetchRelatedData = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/profile/related?id=${user.id}&category=${user.user_category}`);
      if (res.ok) {
        const data = await res.json();
        setRelated(data);
      }
    } catch (err) {
      console.error("Failed to fetch related data:", err);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Suggestion submitted!");
        setForm({ type: "feedback", title: "", description: "" });
        setShowForm(false);
        fetchSuggestions();
      } else {
        toast.error(data.error || "Failed to submit");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "bug": return <Bug className="w-4 h-4 text-red-500" />;
      case "idea": return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case "improvement": return <ThumbsUp className="w-4 h-4 text-green-500" />;
      default: return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
      planned: "bg-purple-100 text-purple-800",
      implemented: "bg-green-100 text-green-800",
      declined: "bg-red-100 text-red-800",
      closed: "bg-gray-100 text-gray-800",
    };
    return colors[status] || colors.open;
  };

  const dept = related?.department || user?.department;
  const desig = related?.designation || user?.designation;
  const grade = related?.grade_level || user?.grade_level;
  const admNo = related?.admission_number || user?.admission_number;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500">View and manage your profile information</p>
      </div>

      {/* Profile Card */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-bdja-primary/10 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-bdja-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user?.full_name}</h2>
            <p className="text-gray-500">{user?.email}</p>
            <Badge variant={user?.user_category === "admin" ? "destructive" : "default"} className="mt-1 capitalize">
              {user?.user_category}
            </Badge>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Department:</span>
            <span className="ml-2 font-medium">{dept || "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">Designation:</span>
            <span className="ml-2 font-medium">{desig || "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">Grade Level:</span>
            <span className="ml-2 font-medium capitalize">{grade || "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">Admission No:</span>
            <span className="ml-2 font-medium">{admNo || "—"}</span>
          </div>
        </div>
      </Card>

      {/* Suggestions Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-bdja-primary" />
            <h2 className="text-lg font-semibold">My Suggestions & Feedback</h2>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            {showForm ? "Cancel" : "Submit New"}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="idea">Idea</option>
                <option value="feedback">Feedback</option>
                <option value="bug">Bug Report</option>
                <option value="improvement">Improvement</option>
                <option value="complaint">Complaint</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Short title..."
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your suggestion in detail..."
                rows={4}
                maxLength={5000}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bdja-primary"
              />
            </div>
            <Button type="submit" disabled={submitting} className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </form>
        )}

        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No suggestions yet. Submit your first idea!</p>
            </div>
          ) : (
            suggestions.map((s) => (
              <div key={s.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    {getTypeIcon(s.type)}
                    <div>
                      <p className="font-medium text-sm">{s.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.description.slice(0, 120)}...</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(s.status)}`}>
                    {s.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Submitted {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
