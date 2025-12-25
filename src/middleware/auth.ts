// =============================================================================
// CalX Backend - Authentication Middleware
// =============================================================================
// JWT authentication for web routes, device token auth for device routes.
// =============================================================================

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyJWT, hashDeviceToken } from '../utils/crypto.js';
import { log } from '../utils/logger.js';
import type { AuthenticatedUserRequest, AuthenticatedDeviceRequest } from '../types/index.js';
import { UnauthorizedError, ForbiddenError } from '../types/index.js';

// =============================================================================
// Web User Authentication (JWT)
// =============================================================================

export async function authenticateUser(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or invalid authorization header');
        }

        const token = authHeader.substring(7);

        try {
            const payload = verifyJWT(token);

            // Verify user exists
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: { id: true, email: true },
            });

            if (!user) {
                throw new UnauthorizedError('User not found');
            }

            // Attach user to request
            (req as AuthenticatedUserRequest).user = {
                id: user.id,
                email: user.email,
            };

            next();
        } catch (jwtError) {
            log.auth.tokenInvalid('JWT verification failed');
            throw new UnauthorizedError('Invalid or expired token');
        }
    } catch (error) {
        next(error);
    }
}

// =============================================================================
// Device Authentication (Device Token)
// =============================================================================

export async function authenticateDevice(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('Missing or invalid authorization header');
        }

        const token = authHeader.substring(7);

        // Validate token format
        if (!token.startsWith('dev_tok_')) {
            throw new UnauthorizedError('Invalid device token format');
        }

        // Hash the token to compare with stored hash
        const tokenHash = hashDeviceToken(token);

        // Find device with matching token
        const device = await prisma.device.findFirst({
            where: {
                deviceToken: tokenHash,
                tokenRevoked: false,
            },
            select: {
                id: true,
                deviceId: true,
                ownerId: true,
            },
        });

        if (!device) {
            log.auth.tokenInvalid('Device token not found or revoked');
            throw new UnauthorizedError('Invalid or revoked device token');
        }

        // Attach device to request
        (req as AuthenticatedDeviceRequest).device = {
            id: device.id,
            deviceId: device.deviceId,
            ownerId: device.ownerId,
        };

        next();
    } catch (error) {
        next(error);
    }
}

// =============================================================================
// Device Ownership Check (for web routes affecting devices)
// =============================================================================

export async function verifyDeviceOwnership(
    req: AuthenticatedUserRequest,
    deviceId: string
): Promise<boolean> {
    const device = await prisma.device.findUnique({
        where: { deviceId },
        select: { ownerId: true },
    });

    if (!device) {
        return false;
    }

    return device.ownerId === req.user.id;
}

// Middleware version
export function requireDeviceOwnership(deviceIdParam: string = 'device_id') {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userReq = req as AuthenticatedUserRequest;
            const deviceId = req.body[deviceIdParam] || req.params.id || req.query.device_id;

            if (!deviceId) {
                throw new ForbiddenError('Device ID is required');
            }

            const isOwner = await verifyDeviceOwnership(userReq, deviceId as string);

            if (!isOwner) {
                throw new ForbiddenError('You do not own this device');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}
