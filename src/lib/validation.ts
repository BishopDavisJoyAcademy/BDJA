import { z } from "zod";

export const chatMessageSchema = z.object({
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

export const searchSchema = z.object({
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
