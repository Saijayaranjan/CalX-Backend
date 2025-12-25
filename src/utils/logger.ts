// =============================================================================
// CalX Backend - Logger Utility
// =============================================================================
// Structured JSON logging using Pino.
// Includes device_id for traceability as per spec.
// =============================================================================

import pino from 'pino';
import { config } from '../config/env.js';

// Create base logger
export const logger = pino({
    level: config.logLevel,
    transport: config.isDev
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
    base: {
        service: 'calx-backend',
        env: config.nodeEnv,
    },
    formatters: {
        level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

// Create child logger with device context
export function createDeviceLogger(deviceId: string) {
    return logger.child({ device_id: deviceId });
}

// Create child logger with user context
export function createUserLogger(userId: string) {
    return logger.child({ user_id: userId });
}

// Create child logger with request context
export function createRequestLogger(requestId: string) {
    return logger.child({ request_id: requestId });
}

// Log levels for different scenarios
export const log = {
    // General info
    info: (msg: string, data?: object) => logger.info(data, msg),

    // Errors
    error: (msg: string, error?: Error | unknown, data?: object) => {
        if (error instanceof Error) {
            logger.error({ ...data, err: error }, msg);
        } else {
            logger.error({ ...data, error }, msg);
        }
    },

    // Warnings
    warn: (msg: string, data?: object) => logger.warn(data, msg),

    // Debug
    debug: (msg: string, data?: object) => logger.debug(data, msg),

    // Device-specific logs
    device: {
        heartbeat: (deviceId: string, battery: number, mode: string) =>
            logger.info({ device_id: deviceId, battery_percent: battery, power_mode: mode }, 'Device heartbeat'),

        bind: (deviceId: string, action: 'request' | 'confirm' | 'complete') =>
            logger.info({ device_id: deviceId, action }, 'Device bind flow'),

        chat: (deviceId: string, sender: string, length: number) =>
            logger.info({ device_id: deviceId, sender, content_length: length }, 'Chat message'),

        ai: (deviceId: string, provider: string, promptLength: number) =>
            logger.info({ device_id: deviceId, provider, prompt_length: promptLength }, 'AI query'),

        ota: (deviceId: string, version: string, status: string) =>
            logger.info({ device_id: deviceId, firmware_version: version, status }, 'OTA update'),

        file: (deviceId: string, charCount: number) =>
            logger.info({ device_id: deviceId, char_count: charCount }, 'File sync'),
    },

    // Auth logs
    auth: {
        register: (email: string) => logger.info({ email }, 'User registered'),
        login: (email: string, success: boolean) =>
            logger.info({ email, success }, success ? 'User login success' : 'User login failed'),
        tokenInvalid: (reason: string) => logger.warn({ reason }, 'Invalid token'),
    },

    // API request logs
    request: (method: string, path: string, statusCode: number, durationMs: number) =>
        logger.info({ method, path, status_code: statusCode, duration_ms: durationMs }, 'API request'),
};

export default logger;
