"use client";

import { useState } from "react";
import { Copy, Check, MessageCircle, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullName: string;
  email: string;
  tempPassword: string;
  phone?: string;
}

function requireEnv(name: string): string {
  if (typeof window !== "undefined") {
    return process.env[name] || "";
  }
  return "";
}

export default function CredentialModal({ isOpen, onClose, fullName, email, tempPassword, phone }: CredentialModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const loginUrl = appUrl ? `${appUrl}/login` : "[Configure NEXT_PUBLIC_APP_URL in .env]";

  const credentialsText = `Hello ${fullName},

Your BDJA account has been created!

Email: ${email}
Temporary Password: ${tempPassword}

Please log in at ${loginUrl} and change your password immediately.

- BDJA ICT Team`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(credentialsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = credentialsText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, "");
    const text = encodeURIComponent(credentialsText);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("Your BDJA Account Credentials");
    const body = encodeURIComponent(credentialsText);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Account Credentials</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <div className="p-3 bg-slate-800 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Name</p>
            <p className="text-sm text-white font-medium">{fullName}</p>
          </div>
          <div className="p-3 bg-slate-800 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Email</p>
            <p className="text-sm text-white font-medium">{email}</p>
          </div>
          <div className="p-3 bg-slate-800 rounded-lg border border-amber-500/20">
            <p className="text-xs text-amber-400 mb-1">Temporary Password</p>
            <p className="text-sm text-white font-mono">{tempPassword}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCopy} variant="outline" size="sm" className="flex-1">
            {copied ? <><Check className="w-4 h-4 mr-1 text-emerald-400" /> Copied</> : <><Copy className="w-4 h-4 mr-1" /> Copy</>}
          </Button>
          {phone && (
            <Button onClick={handleWhatsApp} variant="outline" size="sm" className="flex-1">
              <MessageCircle className="w-4 h-4 mr-1 text-emerald-400" /> WhatsApp
            </Button>
          )}
          <Button onClick={handleEmail} variant="outline" size="sm" className="flex-1">
            <Mail className="w-4 h-4 mr-1 text-blue-400" /> Email
          </Button>
        </div>
      </div>
    </div>
  );
}
