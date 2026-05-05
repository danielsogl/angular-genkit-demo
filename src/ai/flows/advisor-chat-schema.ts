import { z } from '@genkit-ai/core';

export const ChatRoleSchema = z.enum(['user', 'assistant']);
export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ChatMessageSchema = z.object({
  role: ChatRoleSchema,
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatTurnRequestSchema = z.object({
  userName: z.string().nullable(),
  history: z.array(ChatMessageSchema),
  message: z.string().min(1),
});
export type ChatTurnRequest = z.infer<typeof ChatTurnRequestSchema>;

export const ChatTurnResponseSchema = z.object({
  reply: z.string(),
});
export type ChatTurnResponse = z.infer<typeof ChatTurnResponseSchema>;
