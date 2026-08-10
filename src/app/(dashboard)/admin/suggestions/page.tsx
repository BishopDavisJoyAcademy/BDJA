"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  admin_response?: string;
  profiles?: { full_name: string };
  created_at: string;
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");

  useEffect(() => {
    fetchSuggestions();
  }, []);

  async function fetchSuggestions() {
    try {
      const res = await fetch("/api/suggestions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleRespond = async (id: string) => {
    try {
      const res = await fetch("/api/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, admin_response: responseText, status: "implemented" }),
      });
      if (!res.ok) throw new Error("Failed to respond");
      setResponding(null);
      setResponseText("");
      fetchSuggestions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2"><AlertCircle className="w-5 h-5" />{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Suggestions & Feedback</h1>
      <div className="space-y-4">
        {suggestions.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
                <p className="text-xs text-gray-500">by {s.profiles?.full_name || "Unknown"} · {new Date(s.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.priority === "critical" ? "bg-red-100 text-red-700" : s.priority === "high" ? "bg-orange-100 text-orange-700" : s.priority === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                  {s.priority}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === "implemented" ? "bg-green-100 text-green-700" : s.status === "under_review" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                  {s.status}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">{s.description}</p>
            {s.admin_response && (
              <div className="bg-blue-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-blue-800"><span className="font-medium">Response:</span> {s.admin_response}</p>
              </div>
            )}
            {responding === s.id ? (
              <div className="space-y-2">
                <textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" placeholder="Write your response..." />
                <div className="flex gap-2">
                  <button onClick={() => handleRespond(s.id)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Send Response</button>
                  <button onClick={() => { setResponding(null); setResponseText(""); }} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setResponding(s.id)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Respond
              </button>
            )}
          </div>
        ))}
        {suggestions.length === 0 && <p className="text-center text-gray-500 py-8">No suggestions yet</p>}
      </div>
    </div>
  );
}
