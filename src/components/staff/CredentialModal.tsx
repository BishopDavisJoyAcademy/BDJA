"use client";

import { useState } from "react";
import { Copy, Share2, Check, X, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";

interface CredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  tempPassword: string;
  fullName: string;
  phone?: string;
}

export default function CredentialModal({
  isOpen,
  onClose,
  email,
  tempPassword,
  fullName,
  phone,
}: CredentialModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const credentialsText = `Hello ${fullName},\n\nYour BDJA account has been created!\n\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease log in at https://bdja.ac.ke/login and change your password immediately.\n\n- BDJA ICT Team`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(credentialsText);
      setCopied(true);
      toast.success("Credentials copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleWhatsApp = () => {
    if (!phone) {
      toast.error("No phone number available");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const text = encodeURIComponent(credentialsText);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-bdja-primary px-6 py-4 flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg">Account Created</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-sm">
            {fullName} has been added to the system. Share these credentials securely.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
              <p className="text-sm font-mono text-gray-900">{email}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Temporary Password</label>
              <p className="text-sm font-mono text-bdja-primary font-bold">{tempPassword}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy All"}
            </button>
            {phone && (
              <button
                onClick={handleWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 rounded-xl text-sm font-medium text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400 text-center">
            The user will be required to change this password on first login.
          </p>
        </div>
      </div>
    </div>
  );
}
