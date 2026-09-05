"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

interface JoyAdminRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_category: string;
  question: string;
  context: string | null;
  status: "pending" | "in_review" | "answered" | "dismissed";
  admin_response: string | null;
  responded_by: { full_name: string } | null;
  responded_at: string | null;
  priority: string;
  category: string;
  created_at: string;
}

interface UseJoyAdminRequestsReturn {
  requests: JoyAdminRequest[];
  loading: boolean;
  fetchRequests: (status?: string) => Promise<void>;
  createRequest: (data: {
    question: string;
    context?: string;
    conversation_id?: string;
    priority?: string;
    category?: string;
  }) => Promise<JoyAdminRequest | null>;
  respondToRequest: (requestId: string, response: string, status?: "answered" | "dismissed") => Promise<boolean>;
}

export function useJoyAdminRequests(): UseJoyAdminRequestsReturn {
  const [requests, setRequests] = useState<JoyAdminRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const getHeaders = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (s?.access_token) headers["Authorization"] = `Bearer ${s.access_token}`;
    return headers;
  }, []);

  const fetchRequests = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const url = new URL("/api/joy/admin-requests", window.location.origin);
      if (status) url.searchParams.set("status", status);

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRequests(json.requests || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const createRequest = useCallback(async (data: {
    question: string;
    context?: string;
    conversation_id?: string;
    priority?: string;
    category?: string;
  }) => {
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/joy/admin-requests", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      toast.success("Request sent to admin. You'll be notified when there's a response.");
      return json.request as JoyAdminRequest;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return null;
    }
  }, [getHeaders]);

  const respondToRequest = useCallback(async (requestId: string, response: string, status: "answered" | "dismissed" = "answered") => {
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/joy/admin-requests", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, admin_response: response, status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Response sent to user");
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return false;
    }
  }, [getHeaders]);

  return { requests, loading, fetchRequests, createRequest, respondToRequest };
}
