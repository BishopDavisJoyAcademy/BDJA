import { JoyToolCall, JoyToolResult } from "@/types/joy";
import { searchWeb, searchYouTube, summarizePage } from "./joy-search";
import { getSupabaseAdmin } from "./supabase-server";
import { hasPermission } from "./permissions";
import { getErrorMessage } from "./errors";
import { isTableAllowed, redactPii } from "./joy-guardrails";

// ============================================================
// JOY TOOLS — Permission-Gated Tool Execution
// Each tool validates user permissions before executing.
// No tool can access data the user is not authorized to see.
// ============================================================

export interface ToolExecutionContext {
  userId: string;
  userCategory: string;
  userName?: string;
  campusId?: string;
}

/**
 * Tools available per user category.
 * If a tool is not in the list, it is BLOCKED.
 */
const ALLOWED_TOOLS: Record<string, string[]> = {
  student: [
    "search_web",
    "search_youtube",
    "summarize_page",
    "get_student_grades",
    "get_student_attendance",
    "get_timetable",
    "get_calendar_events",
  ],
  parent: [
    "search_web",
    "search_youtube",
    "summarize_page",
    "get_student_grades",
    "get_student_attendance",
    "get_fee_payments",
    "get_timetable",
    "get_calendar_events",
  ],
  staff: [
    "search_web",
    "search_youtube",
    "summarize_page",
    "get_student_grades",
    "get_student_attendance",
    "get_fee_payments",
    "get_timetable",
    "get_calendar_events",
    "send_notification",
    "get_class_students",
    "get_teacher_classes",
  ],
  teacher: [
    "search_web",
    "search_youtube",
    "summarize_page",
    "get_student_grades",
    "get_student_attendance",
    "get_fee_payments",
    "get_timetable",
    "get_calendar_events",
    "send_notification",
    "get_class_students",
    "get_teacher_classes",
  ],
  admin: [
    "search_web",
    "search_youtube",
    "summarize_page",
    "get_student_grades",
    "get_student_attendance",
    "get_fee_payments",
    "get_timetable",
    "get_calendar_events",
    "send_notification",
    "get_class_students",
    "get_teacher_classes",
    "get_analytics_summary",
  ],
};

/**
 * Permission requirements for each tool
 */
const TOOL_PERMISSIONS: Record<string, string> = {
  get_student_grades: "grades.view",
  get_student_attendance: "attendance.view",
  get_fee_payments: "fees.view",
  get_timetable: "timetable.view",
  get_calendar_events: "calendar.view",
  send_notification: "notifications.send",
  get_class_students: "students.view",
  get_teacher_classes: "timetable.view",
  get_analytics_summary: "analytics.view",
};

export const JOY_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_web",
      description: "Search the internet for information using DuckDuckGo.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
          max_results: { type: "number", description: "Number of results (1-10)", default: 5 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_youtube",
      description: "Search YouTube for educational videos.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
          max_results: { type: "number", description: "Number of results (1-10)", default: 5 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "summarize_page",
      description: "Fetch and summarize the content of a web page.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to summarize" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_student_grades",
      description: "Get a student's grades from the database. Students can only view their own grades. Parents can view their children's grades. Teachers can view grades for students in their classes.",
      parameters: {
        type: "object",
        properties: {
          student_id: { type: "string", description: "The student profile ID" },
          limit: { type: "number", default: 10 },
        },
        required: ["student_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_student_attendance",
      description: "Get a student's attendance records. Students can only view their own. Parents can view their children's. Teachers can view for their class students.",
      parameters: {
        type: "object",
        properties: {
          student_id: { type: "string", description: "The student profile ID" },
          limit: { type: "number", default: 30 },
        },
        required: ["student_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_fee_payments",
      description: "Get a student's fee payment history. Parents can view their children's payments.",
      parameters: {
        type: "object",
        properties: {
          student_id: { type: "string", description: "The student profile ID" },
          limit: { type: "number", default: 10 },
        },
        required: ["student_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_timetable",
      description: "Get a class timetable by class ID.",
      parameters: {
        type: "object",
        properties: {
          class_id: { type: "string", description: "The class ID" },
        },
        required: ["class_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_calendar_events",
      description: "Get upcoming school calendar events.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", default: 10 },
          campus_id: { type: "string", description: "Optional campus filter" },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "send_notification",
      description: "Send a notification to a user in the BDJA system. Requires notifications.send permission.",
      parameters: {
        type: "object",
        properties: {
          user_id: { type: "string", description: "The recipient user ID" },
          title: { type: "string", description: "Notification title" },
          content: { type: "string", description: "Notification content" },
          type: { type: "string", description: "Notification type", default: "system" },
        },
        required: ["user_id", "title", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_class_students",
      description: "Get all students in a specific class. Teachers can only access their assigned classes.",
      parameters: {
        type: "object",
        properties: {
          class_id: { type: "string", description: "The class ID" },
        },
        required: ["class_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_teacher_classes",
      description: "Get all classes assigned to the current teacher.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_analytics_summary",
      description: "Get a summary of school analytics. Admin only.",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", description: "Metric type: attendance, grades, fees", enum: ["attendance", "grades", "fees"] },
        },
        required: ["metric"],
      },
    },
  },
];

/**
 * Execute a tool call with full permission validation
 */
export async function executeTool(
  toolCall: JoyToolCall,
  ctx: ToolExecutionContext
): Promise<JoyToolResult> {
  const { name, arguments: argsStr } = toolCall.function;

  // 1. Validate tool is allowed for user category
  const allowedTools = ALLOWED_TOOLS[ctx.userCategory.toLowerCase()] || ALLOWED_TOOLS.student;
  if (!allowedTools.includes(name)) {
    await logToolAudit(ctx.userId, name, "blocked", "Tool not allowed for user category");
    return {
      tool_call_id: toolCall.id,
      role: "tool",
      name,
      content: JSON.stringify({ error: "You do not have permission to use this feature." }),
    };
  }

  // 2. Check specific permission if required
  const requiredPerm = TOOL_PERMISSIONS[name];
  if (requiredPerm) {
    const hasPerm = await hasPermission(ctx.userId, requiredPerm);
    if (!hasPerm) {
      await logToolAudit(ctx.userId, name, "blocked", `Missing permission: ${requiredPerm}`);
      return {
        tool_call_id: toolCall.id,
        role: "tool",
        name,
        content: JSON.stringify({ error: `You need the "${requiredPerm}" permission to use this feature.` }),
      };
    }
  }

  // 3. Parse arguments
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsStr);
  } catch {
    return {
      tool_call_id: toolCall.id,
      role: "tool",
      name,
      content: JSON.stringify({ error: `Invalid JSON arguments for tool ${name}` }),
    };
  }

  // 4. Execute tool
  try {
    const result = await runTool(name, args, ctx);
    await logToolAudit(ctx.userId, name, "success");
    return {
      tool_call_id: toolCall.id,
      role: "tool",
      name,
      content: result,
    };
  } catch (err) {
    const errorMsg = getErrorMessage(err);
    await logToolAudit(ctx.userId, name, "error", errorMsg);
    return {
      tool_call_id: toolCall.id,
      role: "tool",
      name,
      content: JSON.stringify({ error: `Error executing ${name}: ${errorMsg}` }),
    };
  }
}

/**
 * Get tools filtered by user category (for AI context)
 */
export function getToolsForUser(userCategory: string): typeof JOY_TOOLS {
  const allowed = ALLOWED_TOOLS[userCategory.toLowerCase()] || ALLOWED_TOOLS.student;
  return JOY_TOOLS.filter((tool) => allowed.includes(tool.function.name));
}

// ============================================================
// Individual Tool Implementations
// ============================================================

async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolExecutionContext
): Promise<string> {
  const admin = getSupabaseAdmin();

  switch (name) {
    case "search_web": {
      const results = await searchWeb(String(args.query), Number(args.max_results) || 5);
      return JSON.stringify(results);
    }

    case "search_youtube": {
      const results = await searchYouTube(String(args.query), undefined, Number(args.max_results) || 5);
      return JSON.stringify(results);
    }

    case "summarize_page": {
      const summary = await summarizePage(String(args.url));
      return JSON.stringify({ url: args.url, summary: summary.slice(0, 2000) });
    }

    case "get_student_grades": {
      const studentId = String(args.student_id);
      // Cross-user access check
      if (!await canAccessStudentData(ctx.userId, ctx.userCategory, studentId)) {
        return JSON.stringify({ error: "You can only access your own grades or your children's grades." });
      }
      const { data } = await admin
        .from("assessments")
        .select("*, subjects(name)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(Number(args.limit) || 10);
      return JSON.stringify(redactPiiInData(data || []));
    }

    case "get_student_attendance": {
      const studentId = String(args.student_id);
      if (!await canAccessStudentData(ctx.userId, ctx.userCategory, studentId)) {
        return JSON.stringify({ error: "You can only access your own attendance or your children's attendance." });
      }
      const { data } = await admin
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .limit(Number(args.limit) || 30);
      return JSON.stringify(redactPiiInData(data || []));
    }

    case "get_fee_payments": {
      const studentId = String(args.student_id);
      if (!await canAccessStudentData(ctx.userId, ctx.userCategory, studentId)) {
        return JSON.stringify({ error: "You can only access your own fee payments or your children's payments." });
      }
      const { data } = await admin
        .from("fee_payments")
        .select("amount, status, created_at, payment_method")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(Number(args.limit) || 10);
      return JSON.stringify(data || []);
    }

    case "get_timetable": {
      const { data } = await admin
        .from("timetable")
        .select("*, subjects(name), profiles(full_name)")
        .eq("class_id", String(args.class_id))
        .order("day_of_week", { ascending: true });
      return JSON.stringify(data || []);
    }

    case "get_calendar_events": {
      let q = admin
        .from("calendar_events")
        .select("*")
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(Number(args.limit) || 10);
      if (args.campus_id) q = q.eq("campus_id", String(args.campus_id));
      const { data } = await q;
      return JSON.stringify(data || []);
    }

    case "send_notification": {
      const { error } = await admin.from("notifications").insert({
        user_id: String(args.user_id),
        title: String(args.title),
        content: String(args.content),
        type: String(args.type || "system"),
        read: false,
      });
      return JSON.stringify(error ? { error: error.message } : { success: true });
    }

    case "get_class_students": {
      // Teachers can only access their assigned classes
      if (ctx.userCategory === "teacher" || ctx.userCategory === "staff") {
        const { data: classCheck } = await admin
          .from("classes")
          .select("id")
          .eq("id", String(args.class_id))
          .eq("class_teacher_id", ctx.userId)
          .single();
        if (!classCheck) {
          return JSON.stringify({ error: "You can only access students in classes you teach." });
        }
      }
      const { data } = await admin
        .from("students")
        .select("id, admission_number, grade_level, status, profiles(full_name)")
        .eq("class_id", String(args.class_id))
        .eq("status", "active");
      return JSON.stringify(redactPiiInData(data || []));
    }

    case "get_teacher_classes": {
      const { data } = await admin
        .from("classes")
        .select("id, name, grade_level, stream")
        .eq("class_teacher_id", ctx.userId);
      return JSON.stringify(data || []);
    }

    case "get_analytics_summary": {
      const metric = String(args.metric);
      let result: Record<string, unknown> = {};

      if (metric === "attendance") {
        const { data } = await admin
          .from("attendance")
          .select("status")
          .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        const total = (data || []).length;
        const present = (data || []).filter((r) => r.status === "present").length;
        result = { total, present, rate: total > 0 ? Math.round((present / total) * 100) : 0 };
      } else if (metric === "grades") {
        const { data } = await admin
          .from("assessments")
          .select("score, max_score")
          .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
        const scores = (data || []).map((r) => ((r.score ?? 0) / (r.max_score || 1)) * 100);
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        result = { average: Math.round(avg * 10) / 10, count: scores.length };
      } else if (metric === "fees") {
        const { data } = await admin
          .from("fee_payments")
          .select("amount, status")
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        const total = (data || []).reduce((sum, r) => sum + (r.amount || 0), 0);
        const paid = (data || []).filter((r) => r.status === "paid").length;
        result = { totalCollected: total, paidCount: paid };
      }

      return JSON.stringify(result);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ============================================================
// Cross-User Data Access Validation
// ============================================================

async function canAccessStudentData(
  userId: string,
  userCategory: string,
  targetStudentId: string
): Promise<boolean> {
  // Students can only access their own data
  if (userCategory === "student") {
    return userId === targetStudentId;
  }

  // Parents can access their children's data
  if (userCategory === "parent") {
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("parent_students")
      .select("id")
      .eq("parent_id", userId)
      .eq("student_id", targetStudentId)
      .single();
    return !!data;
  }

  // Teachers/Staff can access students in their classes
  if (userCategory === "teacher" || userCategory === "staff") {
    const admin = getSupabaseAdmin();
    const { data: student } = await admin
      .from("students")
      .select("class_id")
      .eq("profile_id", targetStudentId)
      .single();
    if (!student?.class_id) return false;
    const { data: classData } = await admin
      .from("classes")
      .select("id")
      .eq("id", student.class_id)
      .eq("class_teacher_id", userId)
      .single();
    return !!classData;
  }

  // Admins can access all
  if (userCategory === "admin") {
    return true;
  }

  return false;
}

// ============================================================
// Helpers
// ============================================================

function redactPiiInData(data: Record<string, unknown>[]): Record<string, unknown>[] {
  return data.map((item) => {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === "string") {
        const piiResult = redactPii(value);
        redacted[key] = piiResult.redactedText;
      } else if (typeof value === "object" && value !== null) {
        redacted[key] = redactPiiInData([value as Record<string, unknown>])[0];
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  });
}

async function logToolAudit(
  userId: string,
  toolName: string,
  status: "success" | "error" | "blocked",
  errorMessage?: string
): Promise<void> {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    const untypedAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await untypedAdmin.from("joy_audit_log").insert({
      user_id: userId,
      user_category: "unknown",
      action_type: "tool_call",
      tool_name: toolName,
      success: status === "success",
      error_message: errorMessage,
    });
  } catch {
    // Fail silently
  }
}
