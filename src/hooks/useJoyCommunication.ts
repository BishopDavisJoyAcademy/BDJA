"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/errors";

export interface CommunicationDraft {
  id: string;
  sender_id: string;
  recipient_parent_id: string | null;
  recipient_student_id: string | null;
  subject: string;
  body: string;
  tone: "formal" | "professional" | "casual" | "urgent" | "encouraging";
  language: "english" | "kiswahili" | "both";
  ai_drafted: boolean;
  status: "draft" | "sent" | "scheduled" | "cancelled";
  created_at: string;
}

export function useJoyCommunication() {
  const [drafting, setDrafting] = useState(false);
  const [lastDraft, setLastDraft] = useState<CommunicationDraft | null>(null);

  const draftMessage = useCallback(async (params: {
    recipient_parent_id?: string;
    recipient_student_id?: string;
    subject: string;
    context: string;
    tone: "formal" | "professional" | "casual" | "urgent" | "encouraging";
    language: "english" | "kiswahili" | "both";
    include_grade_summary?: boolean;
    include_attendance_summary?: boolean;
  }) => {
    setDrafting(true);
    try {
      const data = await apiPost<{
        success: boolean;
        draftId: string;
        body: string;
        tone: string;
        language: string;
      }>("/api/joy/communication/draft", params);
      toast.success("Message drafted");
      return data;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return null;
    } finally {
      setDrafting(false);
    }
  }, []);

  return { drafting, lastDraft, draftMessage };
}
