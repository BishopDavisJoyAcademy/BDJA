import { z } from "zod";

export const emailSchema = z.string().email("Invalid email address");

export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^A-Za-z0-9]/, "Must contain a special character");

export const pinSchema = z.string()
  .min(4, "PIN must be at least 4 digits")
  .max(8, "PIN must be at most 8 digits")
  .regex(/^\d+$/, "PIN must contain only numbers");

export const createUserSchema = z.object({
  email: emailSchema,
  full_name: z.string().min(2, "Name too short").max(100, "Name too long"),
  role: z.enum(["student", "staff", "admin"]),
  user_category: z.enum(["student", "parent", "staff", "admin"]).optional(),
  campus_id: z.string().uuid().optional(),
  phone: z.string().max(20).optional(),
  admission_number: z.string().max(50).optional(),
  class_id: z.string().uuid().optional(),
  grade_level: z.string().max(20).optional(),
  parent_name: z.string().max(100).optional(),
  parent_email: z.string().email().optional().or(z.literal("")),
  parent_phone: z.string().max(20).optional(),
});

export const createHeadteacherSchema = z.object({
  email: emailSchema,
  full_name: z.string().min(2).max(100),
  phone: z.string().max(20).optional(),
  campus_id: z.string().uuid().optional(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password required"),
  new_password: passwordSchema,
});

export const firstLoginPasswordSchema = z.object({
  new_password: passwordSchema,
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

export const firstLoginPinSchema = z.object({
  new_pin: pinSchema,
  confirm_pin: z.string(),
}).refine((data) => data.new_pin === data.confirm_pin, {
  message: "PINs do not match",
  path: ["confirm_pin"],
});

export const chatMessageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1),
  })).min(1),
  context: z.string().optional(),
  stream: z.boolean().optional(),
});

export const voraSearchSchema = z.object({
  query: z.string().min(1).optional(),
  grade_level: z.string().optional(),
  subject: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});


// Joy AI schemas
export const joyChatMessageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().min(1).max(10000),
    })
  ).min(1).max(50),
  stream: z.boolean().optional(),
  context: z.string().optional(),
  conversationId: z.string().uuid().optional(),
  attachments: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      url: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
      extractedContent: z.string().optional(),
    })
  ).optional(),
});

export const joySearchSchema = z.object({
  query: z.string().min(1).max(500),
  source: z.enum(["web", "youtube", "vora"]).optional(),
  maxResults: z.number().min(1).max(10).optional(),
  summarizeUrl: z.string().url().optional(),
});

export const joyActionSchema = z.object({
  actionType: z.enum(["create", "update", "delete", "read"]),
  payload: z.object({
    table: z.string(),
    data: z.record(z.unknown()).optional(),
    id: z.string().optional(),
    filters: z.record(z.unknown()).optional(),
  }),
});
