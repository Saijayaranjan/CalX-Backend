// =============================================================================
// CalX Backend - Payload Validation Middleware
// =============================================================================
// Validates request payload sizes and enforces limits.
// =============================================================================

import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';
import { PayloadTooLargeError, ValidationError } from '../types/index.js';

// =============================================================================
// Payload Size Validation
// =============================================================================

/**
 * Middleware to validate payload sizes based on content type.
 * Returns 413 Payload Too Large if limits are exceeded.
 */
export function validatePayloadSize(maxBytes: number = 50 * 1024) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const contentLength = req.headers['content-length'];

        if (contentLength && parseInt(contentLength, 10) > maxBytes) {
            return next(new PayloadTooLargeError(`Payload exceeds maximum size of ${maxBytes} bytes`));
        }

        next();
    };
}

// =============================================================================
// Chat Content Validation
// =============================================================================

export function validateChatContent(req: Request, res: Response, next: NextFunction): void {
    const content = req.body?.content;

    if (typeof content === 'string') {
        // Hard limit check (spec says 4k is hard limit, 2.5k is normal limit)
        if (content.length > config.limits.chatHardLimit) {
            return next(
                new PayloadTooLargeError(
                    `Chat content exceeds hard limit of ${config.limits.chatHardLimit} characters`
                )
            );
        }

        // Normal limit check
        if (content.length > config.limits.chatMaxChars) {
            return next(
                new ValidationError(
                    `Chat content exceeds limit of ${config.limits.chatMaxChars} characters`
                )
            );
        }
    }

    next();
}

// =============================================================================
// AI Input Validation
// =============================================================================

export function validateAIInput(req: Request, res: Response, next: NextFunction): void {
    const prompt = req.body?.prompt;

    if (typeof prompt === 'string') {
        // Hard limit check
        if (prompt.length > config.limits.aiInputHardLimit) {
            return next(
                new PayloadTooLargeError(
                    `AI prompt exceeds hard limit of ${config.limits.aiInputHardLimit} characters`
                )
            );
        }

        // Normal limit check
        if (prompt.length > config.limits.aiInputMaxChars) {
            return next(
                new ValidationError(
                    `AI prompt exceeds limit of ${config.limits.aiInputMaxChars} characters`
                )
            );
        }
    }

    next();
}

// =============================================================================
// File Content Validation
// =============================================================================

export function validateFileContent(req: Request, res: Response, next: NextFunction): void {
    const content = req.body?.content;

    if (typeof content === 'string') {
        if (content.length > config.limits.fileMaxChars) {
            return next(
                new PayloadTooLargeError(
                    `File content exceeds limit of ${config.limits.fileMaxChars} characters`
                )
            );
        }
    }

    next();
}

// =============================================================================
// Request Logging Middleware
// =============================================================================

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        // TODO: Add rate limiting hooks here
        // This is where rate limiting logic would be added in future versions
    });

    next();
}

// =============================================================================
// Rate Limiting Placeholder
// =============================================================================

/**
 * PLACEHOLDER: Rate limiting middleware.
 * Not implemented in v1 per spec, but hooks are in place.
 * 
 * To implement rate limiting in the future:
 * 1. Use a library like 'express-rate-limit' or 'rate-limiter-flexible'
 * 2. Configure limits per endpoint type (auth, device, AI)
 * 3. Store rate limit state in Redis for distributed deployments
 */
export function rateLimiter(_type: 'auth' | 'device' | 'ai' | 'general') {
    // No rate limiting in v1 per spec
    return (_req: Request, _res: Response, next: NextFunction): void => {
        // TODO: Implement rate limiting
        // Example: 100 requests per minute for general, 10 for auth, etc.
        next();
    };
}
