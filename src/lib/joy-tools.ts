import { JoyToolCall, JoyToolResult } from "@/types/joy";
import { searchWeb, searchYouTube, summarizePage } from "./joy-search";
import { getSupabaseAdmin } from "./supabase-server";

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
      description: "Get a student's grades from the database.",
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
      description: "Get a student's attendance records.",
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
      name: "get_fee_balance",
      description: "Get a student's fee balance.",
      parameters: {
        type: "object",
        properties: {
          student_id: { type: "string", description: "The student profile ID" },
        },
        required: ["student_id"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_timetable",
      description: "Get a class timetable.",
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
      name: "send_message",
      description: "Send a message to another user in the BDJA messaging system.",
      parameters: {
        type: "object",
        properties: {
          recipient_id: { type: "string", description: "The recipient user ID" },
          subject: { type: "string", description: "Message subject" },
          body: { type: "string", description: "Message body" },
        },
        required: ["recipient_id", "subject", "body"],
      },
    },
  },
];

export async function executeTool(toolCall: JoyToolCall): Promise<JoyToolResult> {
  const { name, arguments: argsStr } = toolCall.function;
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(argsStr);
  } catch {
    return { tool_call_id: toolCall.id, role: "tool", name, content: `Error: Invalid JSON arguments for tool ${name}` };
  }
  try {
    let result: string;
    switch (name) {
      case "search_web": {
        const results = await searchWeb(String(args.query), Number(args.max_results) || 5);
        result = JSON.stringify(results);
        break;
      }
      case "search_youtube": {
        const results = await searchYouTube(String(args.query), undefined, Number(args.max_results) || 5);
        result = JSON.stringify(results);
        break;
      }
      case "summarize_page": {
        const summary = await summarizePage(String(args.url));
        result = JSON.stringify({ url: args.url, summary: summary.slice(0, 2000) });
        break;
      }
      case "get_student_grades": {
        const admin = getSupabaseAdmin();
        const { data } = await admin.from("assessments").select("*, subjects(name)").eq("student_id", String(args.student_id)).order("created_at", { ascending: false }).limit(Number(args.limit) || 10);
        result = JSON.stringify(data || []);
        break;
      }
      case "get_student_attendance": {
        const admin = getSupabaseAdmin();
        const { data } = await admin.from("attendance").select("*").eq("student_id", String(args.student_id)).order("date", { ascending: false }).limit(Number(args.limit) || 30);
        result = JSON.stringify(data || []);
        break;
      }
      case "get_fee_balance": {
        const admin = getSupabaseAdmin();
        const { data } = await admin.from("fee_payments").select("amount_paid, balance").eq("student_id", String(args.student_id)).order("created_at", { ascending: false }).limit(1).single();
        result = JSON.stringify(data || { balance: 0, amount_paid: 0 });
        break;
      }
      case "get_timetable": {
        const admin = getSupabaseAdmin();
        const { data } = await admin.from("timetable").select("*, subjects(name), profiles(full_name)").eq("class_id", String(args.class_id)).order("day_of_week", { ascending: true });
        result = JSON.stringify(data || []);
        break;
      }
      case "get_calendar_events": {
        const admin = getSupabaseAdmin();
        let q = admin.from("calendar_events").select("*").gte("date", new Date().toISOString().split("T")[0]).order("date", { ascending: true }).limit(Number(args.limit) || 10);
        if (args.campus_id) q = q.eq("campus_id", String(args.campus_id));
        const { data } = await q;
        result = JSON.stringify(data || []);
        break;
      }
      case "send_message": {
        const admin = getSupabaseAdmin();
        const { error } = await admin.from("messages").insert({
          recipient_id: String(args.recipient_id),
          subject: String(args.subject),
          body: String(args.body),
          sender_id: "joy_system",
        });
        result = error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
        break;
      }
      default:
        result = `Error: Unknown tool ${name}`;
    }
    return { tool_call_id: toolCall.id, role: "tool", name, content: result };
  } catch (err) {
    return { tool_call_id: toolCall.id, role: "tool", name, content: `Error executing ${name}: ${err instanceof Error ? err.message : String(err)}` };
  }
}
