"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Users, Loader2 } from "lucide-react";
import Image from "next/image";

const GOLD = "#D4AF37";

export interface Child {
  id: string;
  student_id: string;
  full_name: string;
  admission_number: string;
  grade_level: string | null;
  class_name: string | null;
  class_teacher_name: string | null;
  avatar_url: string | null;
  relationship: string | null;
}

interface ParentContextValue {
  children: Child[];
  selectedChild: Child | null;
  setSelectedChild: (child: Child | null) => void;
  loading: boolean;
  error: string | null;
  refreshChildren: () => Promise<void>;
}

const ParentContext = createContext<ParentContextValue | null>(null);

export function useParentContext() {
  const ctx = useContext(ParentContext);
  if (!ctx) throw new Error("useParentContext must be used within ParentProvider");
  return ctx;
}

export function ParentProvider({ children: childNodes }: { children: ReactNode }) {
  const { user } = useAuth();
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [selectedChild, setSelectedChildState] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!user || user.user_category !== "parent") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: { session: s } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const headers: Record<string, string> = {};
      if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;

      const res = await fetch("/api/parent/children", { headers });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch children");
      }
      const data = await res.json();
      const list: Child[] = data.children || [];
      setChildrenList(list);

      // Restore from localStorage or auto-select first
      const savedId = typeof window !== "undefined" ? localStorage.getItem("bdja_selected_child_id") : null;
      if (savedId) {
        const found = list.find((c) => c.student_id === savedId || c.id === savedId);
        if (found) {
          setSelectedChildState(found);
        } else if (list.length > 0) {
          setSelectedChildState(list[0]);
        }
      } else if (list.length > 0) {
        setSelectedChildState(list[0]);
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const setSelectedChild = useCallback((child: Child | null) => {
    setSelectedChildState(child);
    if (child?.student_id && typeof window !== "undefined") {
      localStorage.setItem("bdja_selected_child_id", child.student_id);
    }
  }, []);

  const value: ParentContextValue = {
    children: childrenList,
    selectedChild,
    setSelectedChild,
    loading,
    error,
    refreshChildren: fetchChildren,
  };

  return (
    <ParentContext.Provider value={value}>
      {childNodes}
    </ParentContext.Provider>
  );
}

/** ChildSelector dropdown component for use in parent pages */
export function ChildSelector({ className = "" }: { className?: string }) {
  const { children, selectedChild, setSelectedChild, loading } = useParentContext();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} />
        <span className="text-sm text-slate-400">Loading children...</span>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 ${className}`}>
        <Users className="w-4 h-4 text-slate-500" />
        <span className="text-sm text-slate-400">No children linked</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-[#D4AF37]/30 transition-all text-left"
      >
        <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center shrink-0 overflow-hidden">
          {selectedChild?.avatar_url ? (
            <Image src={selectedChild.avatar_url} alt="" width={32} height={32} className="w-full h-full object-cover" />
          ) : (
            <Users className="w-4 h-4" style={{ color: GOLD }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{selectedChild?.full_name || "Select child"}</p>
          {selectedChild && (
            <p className="text-xs text-slate-400 truncate">
              {selectedChild.admission_number} · {selectedChild.class_name || "No class"}
            </p>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 z-40 bg-slate-900 border border-slate-700/50 rounded-xl shadow-xl overflow-hidden"
            >
              {children.map((child) => (
                <button
                  key={child.student_id}
                  onClick={() => { setSelectedChild(child); setOpen(false); }}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-800/60 transition-colors ${
                    selectedChild?.student_id === child.student_id ? "bg-[#D4AF37]/10" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center shrink-0 overflow-hidden">
                    {child.avatar_url ? (
                      <Image src={child.avatar_url} alt="" width={32} height={32} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{child.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {child.admission_number} · {child.class_name || "No class"}
                    </p>
                  </div>
                  {selectedChild?.student_id === child.student_id && (
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: GOLD }} />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
