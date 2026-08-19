export interface JoyConversation {
  id: string;
  user_id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface JoyMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export type JoyUserPreferences = {
  id: string;
  user_id: string;
  theme: JoyTheme;
  personality_mode: "auto" | "playful" | "study_buddy" | "professional" | "efficient";
  language_preference: "auto" | "english" | "kiswahili";
  show_timestamps: boolean;
  enable_sound: boolean;
  enable_streaming: boolean;
  font_size: "small" | "medium" | "large";
  created_at: string;
  updated_at: string;
};

export type JoyTheme =
  | "light"
  | "dark"
  | "ocean"
  | "forest"
  | "sunset"
  | "midnight"
  | "cream";

export interface JoyAction {
  type: "navigate" | "refresh" | "open_modal" | "create_record" | "update_record" | "delete_record" | "export" | "notify" | "search" | "send_message";
  target?: string;
  payload?: Record<string, unknown>;
  confirmation?: string;
}

export interface JoyContext {
  userName?: string;
  userCategory?: string;
  gradeLevel?: string;
  designation?: string;
  campusId?: string;
  timetable?: Record<string, unknown>[];
  grades?: Record<string, unknown>[];
  assignments?: Record<string, unknown>[];
  fees?: Record<string, unknown>[];
  attendance?: Record<string, unknown>[];
  calendarEvents?: Record<string, unknown>[];
  voraResults?: Record<string, unknown>[];
  children?: Record<string, unknown>[];
  availableActions?: string[];
}

export interface JoyAnalytics {
  id: string;
  user_id: string | null;
  query: string;
  category: string;
  role: string | null;
  resolved: boolean;
  response_time_ms: number | null;
  model_used: string | null;
  created_at: string;
}

export interface JoyActionLog {
  id: string;
  user_id: string;
  action_type: string;
  action_data: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface JoySearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface JoyVideoResult {
  title: string;
  videoId: string;
  thumbnail: string;
  channel: string;
  duration?: string;
  subject?: string;
  gradeLevel?: string;
}

export interface JoyExtractedContent {
  text: string;
  type: "pdf" | "docx" | "image" | "text" | "unknown";
  pages?: number;
  wordCount?: number;
}

export interface JoyToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface JoyToolResult {
  tool_call_id: string;
  role: "tool";
  name: string;
  content: string;
}
