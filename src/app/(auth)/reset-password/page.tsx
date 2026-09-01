"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  Hash,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  Fingerprint,
  Sparkles,
  ChevronRight,
  XCircle,
} from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

const GOLD = "#D4AF37";
const GOLD_LIGHT = "#E8C84A";
const GOLD_DARK = "#B8960C";

// ─── Password Strength Analyzer ───
interface StrengthResult {
  score: number; // 0-5
  label: string;
  color: string;
}

function analyzePasswordStrength(password: string): StrengthResult {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#10b981"];
  return { score, label: labels[score], color: colors[score] };
}

// ─── PIN Dot Visualizer ───
function PinDots({ value, maxLength = 8 }: { value: string; maxLength?: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {Array.from({ length: maxLength }).map((_, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={{
            scale: i < value.length ? 1 : 0.6,
            backgroundColor: i < value.length ? GOLD : "rgba(255,255,255,0.1)",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="w-3 h-3 rounded-full"
        />
      ))}
    </div>
  );
}

// ─── Requirement Item ───
function RequirementItem({
  met,
  label,
  delay = 0,
}: {
  met: boolean;
  label: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="flex items-center gap-2 text-xs"
    >
      <motion.div
        initial={false}
        animate={{
          scale: met ? 1 : 0.8,
          color: met ? "#22c55e" : "#64748b",
        }}
      >
        {met ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
      </motion.div>
      <span className={met ? "text-green-400" : "text-slate-500"}>{label}</span>
    </motion.div>
  );
}

// ─── Strength Bar ───
function StrengthBar({ strength }: { strength: StrengthResult }) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            initial={{ scaleX: 0 }}
            animate={{
              scaleX: 1,
              backgroundColor: i < strength.score ? strength.color : "rgba(255,255,255,0.08)",
            }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            style={{ originX: 0 }}
          />
        ))}
      </div>
      <AnimatePresence mode="wait">
        {strength.score > 0 && (
          <motion.p
            key={strength.label}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="text-[11px] font-medium"
            style={{ color: strength.color }}
          >
            {strength.label}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Success Screen ───
function SuccessScreen({ isStudent }: { isStudent: boolean }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push("/login"), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="text-center space-y-6 py-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
        className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${GOLD}20, ${GOLD}40)`, border: `2px solid ${GOLD}40` }}
      >
        <CheckCircle2 className="w-10 h-10" style={{ color: GOLD }} />
      </motion.div>

      <div className="space-y-2">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-semibold text-white"
        >
          {isStudent ? "PIN Set Successfully" : "Password Updated"}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-slate-400"
        >
          Please log in with your new {isStudent ? "PIN" : "password"}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-center gap-1.5 text-xs text-slate-500"
      >
        <Sparkles className="w-3 h-3" style={{ color: GOLD }} />
        Redirecting to login...
      </motion.div>

      {/* Animated progress bar */}
      <div className="w-full h-0.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: GOLD }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 3, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}

// ─── Main Page ───
export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirst = searchParams.get("first") === "true";
  const type = searchParams.get("type") || "staff";
  const isStudent = type === "student";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newCredential, setNewCredential] = useState("");
  const [confirmCredential, setConfirmCredential] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const newInputRef = useRef<HTMLInputElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const strength = isStudent ? null : analyzePasswordStrength(newCredential);

  const passwordRequirements = isStudent
    ? []
    : [
        { label: "At least 8 characters", met: newCredential.length >= 8 },
        { label: "One uppercase letter", met: /[A-Z]/.test(newCredential) },
        { label: "One lowercase letter", met: /[a-z]/.test(newCredential) },
        { label: "One number", met: /[0-9]/.test(newCredential) },
        { label: "One special character", met: /[^A-Za-z0-9]/.test(newCredential) },
      ];

  const allRequirementsMet = isStudent
    ? newCredential.length >= 4 && newCredential.length <= 8 && /^\d+$/.test(newCredential)
    : passwordRequirements?.every((r) => r.met) ?? false;

  const passwordsMatch = newCredential === confirmCredential && confirmCredential.length > 0;
  const canSubmit = allRequirementsMet && passwordsMatch && (isFirst || currentPassword.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }

      let res;
      if (isFirst) {
        res = await fetch("/api/auth/first-login", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(
            isStudent
              ? { new_pin: newCredential, confirm_pin: confirmCredential }
              : { new_password: newCredential, confirm_password: confirmCredential }
          ),
        });
      } else {
        res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newCredential,
            confirm_password: confirmCredential,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update");
        setLoading(false);
        return;
      }

      setSuccess(true);
      await supabase.auth.signOut();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "An error occurred");
      setLoading(false);
    }
  };

  // Auto-focus first input on mount
  useEffect(() => {
    if (mounted && !isFirst) {
      const timer = setTimeout(() => {
        document.getElementById("current-password")?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
    if (mounted && isFirst) {
      const timer = setTimeout(() => {
        newInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mounted, isFirst]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <KeyRound className="w-8 h-8" style={{ color: GOLD }} />
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${GOLD}08 0%, transparent 70%)`, filter: "blur(60px)" }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
            <SuccessScreen isStudent={isStudent} />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${GOLD}06 0%, transparent 70%)`, filter: "blur(80px)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${GOLD}04 0%, transparent 70%)`, filter: "blur(60px)" }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => router.push("/login")}
          className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to login
        </motion.button>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-slate-700/30">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}25` }}
              >
                {isStudent ? (
                  <Fingerprint className="w-5 h-5" style={{ color: GOLD }} />
                ) : (
                  <ShieldCheck className="w-5 h-5" style={{ color: GOLD }} />
                )}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">
                  {isFirst ? `Set Your ${isStudent ? "PIN" : "Password"}` : "Reset Password"}
                </h1>
                <p className="text-xs text-slate-500">
                  {isStudent ? "Bishop Davis Joy Academy — Student Portal" : "Bishop Davis Joy Academy — Staff Portal"}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-400">
              {isFirst
                ? `Create a secure ${isStudent ? "4-8 digit PIN" : "password"} for your account.`
                : "Enter your current password and choose a new one."}
            </p>
          </div>

          {/* Form */}
          <div className="p-6 pt-4">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="mb-4 p-3 rounded-xl flex items-start gap-2.5"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Current Password (only for reset, not first login) */}
              <AnimatePresence>
                {!isFirst && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Current Password
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="current-password"
                        type={showCurrent ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        onFocus={() => setFocusedField("current")}
                        onBlur={() => setFocusedField(null)}
                        required
                        className="w-full pl-10 pr-11 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none transition-all"
                        style={{
                          borderColor: focusedField === "current" ? GOLD : undefined,
                          boxShadow: focusedField === "current" ? `0 0 0 3px ${GOLD}14` : undefined,
                        }}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* New Credential */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                  New {isStudent ? "PIN" : "Password"}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    {isStudent ? <Hash className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                  </div>
                  <input
                    ref={newInputRef}
                    type={isStudent ? (showNew ? "text" : "tel") : showNew ? "text" : "password"}
                    inputMode={isStudent ? "numeric" : undefined}
                    value={newCredential}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isStudent) {
                        // Only allow digits for PIN
                        const digitsOnly = val.replace(/\D/g, "");
                        if (digitsOnly.length <= 8) setNewCredential(digitsOnly);
                      } else {
                        setNewCredential(val);
                      }
                    }}
                    onFocus={() => setFocusedField("new")}
                    onBlur={() => setFocusedField(null)}
                    required
                    minLength={isStudent ? 4 : 8}
                    maxLength={isStudent ? 8 : 128}
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none transition-all tracking-wider"
                    style={{
                      borderColor: focusedField === "new" ? GOLD : undefined,
                      boxShadow: focusedField === "new" ? `0 0 0 3px ${GOLD}14` : undefined,
                    }}
                    placeholder={isStudent ? "••••" : "Create a strong password"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* PIN dots visualization */}
                {isStudent && newCredential.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <PinDots value={newCredential} maxLength={8} />
                  </motion.div>
                )}

                {/* PIN hint */}
                {isStudent && (
                  <p className="text-[11px] text-slate-600">
                    4–8 digits only. Numbers will be hidden for security.
                  </p>
                )}

                {/* Password strength + requirements */}
                {!isStudent && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: newCredential.length > 0 ? 1 : 0 }}
                    className="space-y-2 pt-1"
                  >
                    <StrengthBar strength={strength!} />
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {passwordRequirements.map((req, i) => (
                        <RequirementItem key={req.label} met={req.met} label={req.label} delay={i * 0.05} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Confirm Credential */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Confirm {isStudent ? "PIN" : "Password"}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    {isStudent ? <Hash className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                  </div>
                  <input
                    ref={confirmInputRef}
                    type={isStudent ? (showConfirm ? "text" : "tel") : showConfirm ? "text" : "password"}
                    inputMode={isStudent ? "numeric" : undefined}
                    value={confirmCredential}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isStudent) {
                        const digitsOnly = val.replace(/\D/g, "");
                        if (digitsOnly.length <= 8) setConfirmCredential(digitsOnly);
                      } else {
                        setConfirmCredential(val);
                      }
                    }}
                    onFocus={() => setFocusedField("confirm")}
                    onBlur={() => setFocusedField(null)}
                    required
                    minLength={isStudent ? 4 : 8}
                    maxLength={isStudent ? 8 : 128}
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none transition-all tracking-wider"
                    style={{
                      borderColor:
                        focusedField === "confirm"
                          ? GOLD
                          : confirmCredential.length > 0 && !passwordsMatch
                          ? "rgba(239,68,68,0.5)"
                          : passwordsMatch
                          ? "rgba(34,197,94,0.4)"
                          : undefined,
                      boxShadow: focusedField === "confirm" ? `0 0 0 3px ${GOLD}14` : undefined,
                    }}
                    placeholder={isStudent ? "••••" : "Re-enter your password"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Match indicator */}
                <AnimatePresence>
                  {confirmCredential.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {passwordsMatch ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          <span className="text-green-400">{isStudent ? "PINs match" : "Passwords match"}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-amber-400">{isStudent ? "PINs do not match" : "Passwords do not match"}</span>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading || !canSubmit}
                whileHover={canSubmit && !loading ? { scale: 1.01 } : {}}
                whileTap={canSubmit && !loading ? { scale: 0.98 } : {}}
                className="w-full py-2.5 px-4 font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                style={{
                  background: canSubmit && !loading ? GOLD : "rgba(212,175,55,0.15)",
                  color: canSubmit && !loading ? "#0a1628" : "rgba(212,175,55,0.5)",
                  border: `1px solid ${canSubmit && !loading ? GOLD : "rgba(212,175,55,0.2)"}`,
                }}
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <KeyRound className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <>
                    {isFirst ? "Set " : "Update "}
                    {isStudent ? "PIN" : "Password"}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-700/30 bg-slate-900/50">
            <p className="text-[11px] text-slate-600 text-center">
              {isStudent
                ? "Your PIN is encrypted and stored securely. Never share it with anyone."
                : "Use a unique password with mixed characters for maximum security."}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
