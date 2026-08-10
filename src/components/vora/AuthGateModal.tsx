"use client";

import { useRouter } from "next/navigation";
import { X, GraduationCap, LogIn } from "lucide-react";

interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle: string;
}

export function AuthGateModal({ isOpen, onClose, videoTitle }: AuthGateModalProps) {
  const router = useRouter();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md mx-4 p-6 rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Sign In to Watch</h3>
          <p className="text-sm text-gray-500 mb-6">
            "{videoTitle}" is available to BDJA students and staff. Sign in to access the full video library.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/login?redirect=/vora")}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </button>
            <button
              onClick={() => router.push("/admissions")}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              New Student? Apply Here
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            You can still browse the catalog without signing in.
          </p>
        </div>
      </div>
    </div>
  );
}
