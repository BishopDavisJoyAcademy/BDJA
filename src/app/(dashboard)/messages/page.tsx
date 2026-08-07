"use client";

import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500">Communicate with teachers, staff, and parents</p>
      </div>
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <MessageSquare className="w-5 h-5 text-bdja-primary" />
          <span className="font-medium">Inbox</span>
        </div>
        <p className="text-gray-500 text-sm mt-2">Your messages will appear here.</p>
      </Card>
    </div>
  );
}
