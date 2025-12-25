// =============================================================================
// CalX Backend - Error Handler Middleware
// =============================================================================
// Global error handling with structured logging.
// =============================================================================

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../types/index.js';
import { log } from '../utils/logger.js';
import { config } from '../config/env.js';

interface ErrorResponse {
    error: string;
    details?: unknown;
}

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Default error values
    let statusCode = 500;
    let message = 'Internal server error';
    let details: unknown = undefined;

    // Handle known error types
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
    } else if (err instanceof ZodError) {
        statusCode = 400;
        message = 'Validation error';
        details = err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
        }));
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Log the error
    if (statusCode >= 500) {
        log.error('Internal server error', err, {
            path: req.path,
            method: req.method,
            statusCode,
        });
    } else {
        log.warn('Client error', {
            path: req.path,
            method: req.method,
            statusCode,
            message,
        });
    }

    // Build response
    const response: ErrorResponse = { error: message };

    // Only include details in development
    if (config.isDev && details) {
        response.details = details;
    }

    // Don't expose internal error details in production
    if (config.isProd && statusCode >= 500) {
        response.error = 'Internal server error';
    }

    res.status(statusCode).json(response);
}

// =============================================================================
// Not Found Handler
// =============================================================================

export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({ error: 'Not found' });
}

// =============================================================================
// Async Handler Wrapper
// =============================================================================

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(fn: AsyncHandler) {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
