"use server";

import { getSupabaseAdmin } from "./supabase-server";

// ============================================================
// JOY GUARDRAILS — Input/Output Security Layer
// Blocks prompt injection, SQL injection, PII exposure, harmful content
// ============================================================

const SQL_KEYWORDS = [
  "DROP", "DELETE", "TRUNCATE", "ALTER", "CREATE", "EXEC", "EXECUTE",
  "INSERT INTO", "UPDATE", "UNION", "SELECT * FROM", ";--", "/*", "*/",
  "xp_", "sp_", "information_schema", "pg_catalog", "pg_sleep",
];

const SHELL_PATTERNS = [
  "rm -rf", "chmod", "chown", "wget", "curl", "nc -", "bash -c",
  "python -c", "perl -e", "ruby -e", "$(", "`", "| sh", "| bash",
];

const PROMPT_INJECTION_PATTERNS = [
  "ignore previous instructions",
  "ignore all previous",
  "disregard your instructions",
  "you are now",
  "new role:",
  "system prompt",
  "developer mode",
  "DAN mode",
  "jailbreak",
  "do anything now",
  "ignore the above",
  "forget everything",
  "override safety",
  "bypass restrictions",
  "pretend you are",
  "act as if",
  "simulate being",
  "hypothetically",
  "in a fictional scenario",
  "for educational purposes only",
];

const HARMFUL_CATEGORIES = [
  "how to make", "how to build", "how to create", "recipe for",
  "instructions for", "steps to make",
];

const PII_PATTERNS = [
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, type: "email" },
  { regex: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, type: "phone" },
  { regex: /\b\d{8,12}\b/g, type: "admission_number" },
  { regex: /\b\d{6,8}\b/g, type: "student_id" },
];

// Tables that Joy should NEVER access
export const JOY_BLACKLISTED_TABLES = [
  "profiles",
  "auth.users",
  "staff_permissions",
  "password_history",
  "admin_recovery_log",
  "account_lockouts",
  "login_attempts",
  "login_audit",
];

// Tables Joy can access with proper permissions
export const JOY_WHITELISTED_TABLES: Record<string, string[]> = {
  student: ["timetable", "assignments", "assessments", "attendance", "subjects", "classes", "announcements", "calendar_events", "saved_videos"],
  parent: ["timetable", "assignments", "assessments", "attendance", "subjects", "classes", "announcements", "calendar_events", "fee_payments", "fee_structures"],
  staff: ["timetable", "assignments", "assessments", "attendance", "subjects", "classes", "students", "announcements", "calendar_events", "notifications", "messages"],
  teacher: ["timetable", "assignments", "assessments", "attendance", "subjects", "classes", "students", "announcements", "calendar_events", "notifications", "messages"],
  admin: ["timetable", "assignments", "assessments", "attendance", "subjects", "classes", "students", "announcements", "calendar_events", "notifications", "messages", "fee_payments", "fee_structures", "campuses"],
};

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  violationType?: string;
  severity?: "low" | "medium" | "high" | "critical";
  sanitizedQuery?: string;
}

export interface PiiScanResult {
  hasPii: boolean;
  redactedText: string;
  detectedTypes: string[];
}

/**
 * Check if a query passes all input guardrails
 */
export async function checkInputGuardrails(
  query: string,
  userId: string,
  userCategory: string
): Promise<GuardrailResult> {
  const lowerQuery = query.toLowerCase();

  // 1. Check for prompt injection
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (lowerQuery.includes(pattern.toLowerCase())) {
      await logGuardrailViolation(userId, "prompt_injection", query, "high");
      return {
        allowed: false,
        reason: "I cannot process requests that attempt to override my instructions. Please ask your question directly.",
        violationType: "prompt_injection",
        severity: "high",
      };
    }
  }

  // 2. Check for SQL injection
  for (const keyword of SQL_KEYWORDS) {
    if (lowerQuery.includes(keyword.toLowerCase())) {
      await logGuardrailViolation(userId, "sql_injection", query, "critical");
      return {
        allowed: false,
        reason: "I detected potentially harmful database commands in your message. Please rephrase your question.",
        violationType: "sql_injection",
        severity: "critical",
      };
    }
  }

  // 3. Check for shell commands
  for (const pattern of SHELL_PATTERNS) {
    if (lowerQuery.includes(pattern.toLowerCase())) {
      await logGuardrailViolation(userId, "harmful_content", query, "critical");
      return {
        allowed: false,
        reason: "I cannot process requests involving system commands. Please ask about school-related topics.",
        violationType: "harmful_content",
        severity: "critical",
      };
    }
  }

  // 4. Check for harmful content patterns
  for (const category of HARMFUL_CATEGORIES) {
    if (lowerQuery.includes(category.toLowerCase())) {
      // Flag but don't block — could be legitimate (e.g., "how to make a timetable")
      const flagged = await logGuardrailViolation(userId, "harmful_content", query, "medium", false);
      if (flagged) {
        return {
          allowed: true,
          reason: "Your query was flagged for review. Proceeding with caution.",
          violationType: "harmful_content",
          severity: "medium",
          sanitizedQuery: query,
        };
      }
    }
  }

  // 5. Check table access attempts
  for (const table of JOY_BLACKLISTED_TABLES) {
    if (lowerQuery.includes(table.toLowerCase())) {
      await logGuardrailViolation(userId, "blacklisted_table_access", query, "high");
      return {
        allowed: false,
        reason: "I cannot access that information. Please ask about school-related topics.",
        violationType: "blacklisted_table_access",
        severity: "high",
      };
    }
  }

  return { allowed: true, sanitizedQuery: query };
}

/**
 * Sanitize and redact PII from text
 */
export function redactPii(text: string): PiiScanResult {
  let redacted = text;
  const detectedTypes: string[] = [];

  for (const pattern of PII_PATTERNS) {
    const matches = text.match(pattern.regex);
    if (matches && matches.length > 0) {
      detectedTypes.push(pattern.type);
      redacted = redacted.replace(pattern.regex, `[REDACTED_${pattern.type.toUpperCase()}]`);
    }
  }

  return {
    hasPii: detectedTypes.length > 0,
    redactedText: redacted,
    detectedTypes,
  };
}

/**
 * Sanitize AI output before sending to user
 */
export function sanitizeOutput(text: string): string {
  // Redact any PII that might have leaked through
  const piiResult = redactPii(text);

  // Remove any system prompt leakage
  let sanitized = piiResult.redactedText;

  // Remove common prompt leakage patterns
  const leakagePatterns = [
    /You are Joy.*?Bishop Davis Joy Academy/s,
    /IDENTITY RULES.*?CORE VALUES/s,
    /SYSTEM PROMPT.*?END SYSTEM PROMPT/s,
    /<system>.*?<\/system>/s,
    /\[SYSTEM\].*?\[\/SYSTEM\]/s,
  ];

  for (const pattern of leakagePatterns) {
    sanitized = sanitized.replace(pattern, "[system content redacted]");
  }

  return sanitized;
}

/**
 * Check if a table is accessible for a user category
 */
export function isTableAllowed(tableName: string, userCategory: string): boolean {
  const normalizedCategory = userCategory.toLowerCase();
  const allowed = JOY_WHITELISTED_TABLES[normalizedCategory] || JOY_WHITELISTED_TABLES.student;
  return allowed.includes(tableName.toLowerCase());
}

/**
 * Log a guardrail violation to the database
 */
async function logGuardrailViolation(
  userId: string,
  violationType: string,
  queryPreview: string,
  severity: "low" | "medium" | "high" | "critical",
  blocked: boolean = true
): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();
    await admin.from("joy_guardrail_violations").insert({
      user_id: userId,
      violation_type: violationType,
      query_preview: queryPreview.slice(0, 500),
      blocked,
      severity,
    });
    return true;
  } catch {
    // Fail silently — don't block the guardrail itself
    return false;
  }
}

/**
 * Classify query intent for analytics
 */
export function classifyQueryIntent(query: string): string {
  const lower = query.toLowerCase();

  if (lower.includes("grade") || lower.includes("mark") || lower.includes("score") || lower.includes("result")) return "grades";
  if (lower.includes("attendance") || lower.includes("present") || lower.includes("absent")) return "attendance";
  if (lower.includes("timetable") || lower.includes("schedule") || lower.includes("class time")) return "timetable";
  if (lower.includes("fee") || lower.includes("payment") || lower.includes("balance") || lower.includes("dues")) return "fees";
  if (lower.includes("assignment") || lower.includes("homework") || lower.includes("task")) return "assignments";
  if (lower.includes("report") || lower.includes("card") || lower.includes("progress")) return "report_generation";
  if (lower.includes("message") || lower.includes("email") || lower.includes("contact") || lower.includes("call")) return "communication";
  if (lower.includes("analytics") || lower.includes("trend") || lower.includes("pattern") || lower.includes("insight")) return "analytics";
  if (lower.includes("help") || lower.includes("how do i") || lower.includes("how to")) return "help";
  if (lower.includes("hello") || lower.includes("hi ") || lower.includes("hey") || lower.includes("good morning")) return "greeting";

  return "other";
}
