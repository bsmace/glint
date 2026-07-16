/**
 * Glint - Zod Schema for AI Output Validation
 * Ensures type-safe AI responses to prevent "[object Object]" bugs
 */

import { z } from 'zod';

/**
 * Schema for AI rewrite response
 */
export const AIResponseSchema = z.object({
  success: z.boolean(),
  result: z.string().optional(),
  error: z.string().optional(),
});

/**
 * Schema for prompt history item
 */
export const PromptHistoryItemSchema = z.object({
  id: z.string().uuid(),
  originalText: z.string().min(1),
  improvedText: z.string().min(1),
  timestamp: z.number().positive(),
  site: z.string(),
  tags: z.array(z.string()),
});

/**
 * Schema for detection result
 */
export const DetectionResultSchema = z.object({
  element: z.custom<HTMLElement>(),
  strategy: z.string(),
  confidence: z.number().min(0).max(1),
  metadata: z.object({
    ariaRole: z.string().optional(),
    isContentEditable: z.boolean().optional(),
    placeholder: z.string().optional(),
    nearbySendButton: z.custom<HTMLElement | null>().optional(),
  }),
});

/**
 * Schema for UI state
 */
export const UIStateSchema = z.object({
  isVisible: z.boolean(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  activeMode: z.enum(['improve', 'concise', 'context', 'format']).nullable(),
  isProcessing: z.boolean(),
  lastError: z.string().nullable(),
  characterCount: z.number().nonnegative(),
  characterLimit: z.number().default(2500),
});

/**
 * Schema for remote adapter config
 */
export const RemoteAdapterConfigSchema = z.object({
  version: z.string(),
  selectors: z.record(
    z.string(),
    z.object({
      inputSelector: z.string(),
      sendButtonSelector: z.string(),
      containerSelector: z.string().optional(),
    })
  ),
  updatedAt: z.string().datetime(),
});

/**
 * Type exports inferred from schemas
 */
export type AIResponse = z.infer<typeof AIResponseSchema>;
export type PromptHistoryItem = z.infer<typeof PromptHistoryItemSchema>;
export type DetectionResult = z.infer<typeof DetectionResultSchema>;
export type UIState = z.infer<typeof UIStateSchema>;
export type RemoteAdapterConfig = z.infer<typeof RemoteAdapterConfigSchema>;

/**
 * Validate AI response and return typed result
 */
export function validateAIResponse(data: unknown): AIResponse {
  try {
    return AIResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Invalid AI response: ${error.errors.map((e) => e.message).join(', ')}`,
      };
    }
    throw error;
  }
}

/**
 * Validate prompt history item
 */
export function validatePromptHistoryItem(data: unknown): PromptHistoryItem {
  try {
    return PromptHistoryItemSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid prompt history item: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Validate remote adapter config
 */
export function validateRemoteAdapterConfig(data: unknown): RemoteAdapterConfig {
  try {
    return RemoteAdapterConfigSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid adapter config: ${error.errors.map((e) => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Check if character count exceeds limit
 */
export function validateCharacterCount(count: number, limit: number = 2500): {
  isValid: boolean;
  remaining: number;
  isOverLimit: boolean;
} {
  const remaining = limit - count;
  return {
    isValid: count <= limit,
    remaining,
    isOverLimit: count > limit,
  };
}
