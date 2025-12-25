// =============================================================================
// CalX Backend - TypeScript Types
// =============================================================================

import type { Request } from 'express';

// AI Provider type (matches Prisma enum)
export type AIProvider = 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'DEEPSEEK' | 'PERPLEXITY' | 'GROQ' | 'OPENROUTER';

// =============================================================================
// Request Types (Extended Express Request)
// =============================================================================

export interface AuthenticatedUserRequest extends Request {
    user: {
        id: string;
        email: string;
    };
}

export interface AuthenticatedDeviceRequest extends Request {
    device: {
        id: string;
        deviceId: string;
        ownerId: string | null;
    };
}

// =============================================================================
// API Request Bodies
// =============================================================================

// Auth
export interface RegisterBody {
    email: string;
    password: string;
}

export interface LoginBody {
    email: string;
    password: string;
}

// Bind
export interface BindRequestBody {
    device_id: string;
}

export interface BindConfirmBody {
    bind_code: string;
}

// Heartbeat
export interface HeartbeatBody {
    battery_percent: number;
    power_mode: 'NORMAL' | 'LOW';
    firmware_version: string;
}

// Chat
export interface ChatSendBody {
    content: string;
}

export interface WebChatSendBody {
    device_id: string;
    content: string;
}

// File
export interface FileUploadBody {
    device_id: string;
    content: string;
}

// Settings
export interface DeviceSettingsBody {
    device_id: string;
    power_mode?: 'NORMAL' | 'LOW';
    text_size?: 'SMALL' | 'NORMAL' | 'LARGE';
    keyboard?: 'QWERTY' | 'T9';
    screen_timeout?: number;
    ai_config?: {
        provider?: AIProvider;
        model?: string;
        max_chars?: number;
        temperature?: number;
        api_key?: string;
    };
}

// AI
export interface AIQueryBody {
    prompt: string;
}

// OTA
export interface TriggerOTABody {
    device_id: string;
    firmware_id: string;
}

// =============================================================================
// API Responses
// =============================================================================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface BindRequestResponse {
    bind_code: string;
    expires_in: number;
}

export interface BindStatusResponse {
    bound: boolean;
    device_token?: string;
}

export interface BindConfirmResponse {
    status: 'bound';
    device_id: string;
}

export interface LoginResponse {
    token: string;
    user: {
        id: string;
        email: string;
    };
}

export interface DeviceSettingsResponse {
    power_mode: string;
    text_size: string;
    keyboard: string;
    screen_timeout: number;
    ai_config: {
        provider: string;
        model: string;
        max_chars: number;
        temperature: number;
    } | null;
}

export interface ChatMessageResponse {
    id: string;
    sender: 'DEVICE' | 'WEB';
    content: string;
    created_at: string;
}

export interface ChatListResponse {
    messages: ChatMessageResponse[];
}

export interface FileResponse {
    content: string;
    char_count: number;
}

export interface AIQueryResponse {
    chunk: string;
    has_more: boolean;
    cursor?: string;
}

export interface UpdateCheckResponse {
    available: boolean;
    version?: string;
    checksum?: string;
    file_size?: number;
}

export interface ActivityLogResponse {
    last_ai_query: string | null;
    last_file_sync: string | null;
    last_chat_message: string | null;
}

// =============================================================================
// AI Provider Types
// =============================================================================

export interface AIProviderConfig {
    provider: AIProvider;
    model: string;
    apiKey: string;
    maxChars: number;
    temperature: number;
}

export interface AIRequestOptions {
    prompt: string;
    config: AIProviderConfig;
}

export interface AIRawResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
    };
}

// =============================================================================
// Error Types
// =============================================================================

export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public isOperational = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(400, message);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(401, message);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(403, message);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Not found') {
        super(404, message);
    }
}

export class PayloadTooLargeError extends AppError {
    constructor(message = 'Payload too large') {
        super(413, message);
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests') {
        super(429, message);
    }
}
