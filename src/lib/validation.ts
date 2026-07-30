import { z } from "zod";

export const emailSchema = z.string().email("Invalid email address");

export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .regex(/[^A-Za-z0-9]/, "Must contain a special character");

export const createUserSchema = z.object({
  email: emailSchema,
  full_name: z.string().min(2, "Name too short").max(100, "Name too long"),
  role: z.enum(["student", "parent", "teacher", "class_prefect", "bursar", "librarian", "principal", "super_admin"]),
  campus_id: z.string().uuid().optional(),
  phone: z.string().max(20).optional(),
  admission_number: z.string().max(50).optional(),
  class_id: z.string().uuid().optional(),
  grade_level: z.enum(["playgroup", "pp1", "pp2", "grade1", "grade2", "grade3", "grade4", "grade5", "grade6"]).optional(),
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

export const chatMessageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).max(10000),
  })).max(50),
  context: z.record(z.any()).optional(),
  stream: z.boolean().optional(),
});

export const voraSearchSchema = z.object({
  query: z.string().min(1).max(200),
  grade_level: z.enum(["playgroup", "pp1", "pp2", "grade1", "grade2", "grade3", "grade4", "grade5", "grade6", "all"]).optional(),
  subject: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().min(1).max(20).optional().default(10),
});

export const saveVideoSchema = z.object({
  video_id: z.string().min(1),
  title: z.string().min(1),
  subject: z.string().optional(),
  grade_level: z.string().optional(),
  youtube_url: z.string().url(),
  summary: z.string().optional(),
  thumbnail_url: z.string().url().optional(),
  duration_seconds: z.number().optional(),
  difficulty: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateHeadteacherInput = z.infer<typeof createHeadteacherSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type VoraSearchInput = z.infer<typeof voraSearchSchema>;
export type SaveVideoInput = z.infer<typeof saveVideoSchema>;
