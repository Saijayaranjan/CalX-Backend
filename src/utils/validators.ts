// =============================================================================
// CalX Backend - Validation Utilities
// =============================================================================
// Zod schemas for all API input validation.
// =============================================================================

import { z } from 'zod';
import { config } from '../config/env.js';

// =============================================================================
// Auth Schemas
// =============================================================================

export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password too long'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

// =============================================================================
// Bind Schemas
// =============================================================================

export const bindRequestSchema = z.object({
    device_id: z
        .string()
        .min(1, 'Device ID is required')
        .max(50, 'Device ID too long')
        .regex(/^calx_[A-Za-z0-9]+$/, 'Invalid device ID format (expected: calx_XXXXXX)'),
});

export const bindConfirmSchema = z.object({
    bind_code: z
        .string()
        .min(4, 'Bind code must be 4 characters')
        .max(6, 'Bind code must be at most 6 characters')
        .toUpperCase(),
});

// =============================================================================
// Heartbeat Schema
// =============================================================================

export const heartbeatSchema = z.object({
    battery_percent: z.number().int().min(0).max(100),
    power_mode: z.enum(['NORMAL', 'LOW']),
    firmware_version: z.string().min(1).max(20),
});

// =============================================================================
// Chat Schemas
// =============================================================================

export const chatSendSchema = z.object({
    content: z
        .string()
        .min(1, 'Content is required')
        .max(config.limits.chatMaxChars, `Content must be at most ${config.limits.chatMaxChars} characters`),
});

export const webChatSendSchema = z.object({
    device_id: z.string().min(1, 'Device ID is required'),
    content: z
        .string()
        .min(1, 'Content is required')
        .max(config.limits.chatMaxChars, `Content must be at most ${config.limits.chatMaxChars} characters`),
});

// =============================================================================
// File Schema
// =============================================================================

export const fileUploadSchema = z.object({
    device_id: z.string().min(1, 'Device ID is required'),
    content: z
        .string()
        .max(config.limits.fileMaxChars, `File content must be at most ${config.limits.fileMaxChars} characters`),
});

// =============================================================================
// Settings Schema
// =============================================================================

export const deviceSettingsSchema = z.object({
    device_id: z.string().min(1, 'Device ID is required'),
    power_mode: z.enum(['NORMAL', 'LOW']).optional(),
    text_size: z.enum(['SMALL', 'NORMAL', 'LARGE']).optional(),
    keyboard: z.enum(['QWERTY', 'T9']).optional(),
    screen_timeout: z.number().int().min(5).max(300).optional(),
    ai_config: z
        .object({
            provider: z.enum(['OPENAI', 'ANTHROPIC', 'GEMINI', 'DEEPSEEK', 'PERPLEXITY', 'GROQ', 'OPENROUTER']).optional(),
            model: z.string().max(50).optional(),
            max_chars: z.number().int().min(100).max(config.limits.aiInputMaxChars).optional(),
            temperature: z.number().min(0).max(2).optional(),
            api_key: z.string().max(200).optional(), // User's own API key
        })
        .optional(),
});

// =============================================================================
// AI Schema
// =============================================================================

export const aiQuerySchema = z.object({
    prompt: z
        .string()
        .min(1, 'Prompt is required')
        .max(config.limits.aiInputMaxChars, `Prompt must be at most ${config.limits.aiInputMaxChars} characters`),
});

// =============================================================================
// OTA Schema
// =============================================================================

export const triggerOTASchema = z.object({
    device_id: z.string().min(1, 'Device ID is required'),
    firmware_id: z.string().uuid('Invalid firmware ID'),
});

// =============================================================================
// Query Params Schemas
// =============================================================================

export const chatQuerySchema = z.object({
    since: z.string().datetime().optional(),
});

export const bindStatusQuerySchema = z.object({
    device_id: z.string().min(1, 'Device ID is required'),
});

export const updateDownloadQuerySchema = z.object({
    version: z.string().min(1, 'Version is required'),
});

export const aiContinueQuerySchema = z.object({
    cursor: z.string().min(1, 'Cursor is required'),
});

// =============================================================================
// Validation Helper
// =============================================================================

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errors = result.error.errors.map((e) => e.message).join(', ');
        throw new Error(errors);
    }
    return result.data;
}
