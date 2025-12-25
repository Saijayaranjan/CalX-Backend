// =============================================================================
// CalX Backend - Web Bind Routes
// =============================================================================
// User confirms device binding.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateUser } from '../../middleware/auth.js';
import { bindConfirmSchema } from '../../utils/validators.js';
import { ValidationError, ForbiddenError } from '../../types/index.js';
import type { AuthenticatedUserRequest } from '../../types/index.js';
import { prisma } from '../../lib/prisma.js';
import { generateDeviceToken, hashDeviceToken } from '../../utils/crypto.js';
import { log } from '../../utils/logger.js';

const router = Router();

// =============================================================================
// POST /web/bind/confirm
// =============================================================================
// User confirms device binding with bind code.

router.post(
    '/confirm',
    authenticateUser,
    asyncHandler(async (req, res) => {
        const userReq = req as AuthenticatedUserRequest;

        // Validate input
        const result = bindConfirmSchema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { bind_code } = result.data;

        // Find valid bind code
        const bindCode = await prisma.bindCode.findFirst({
            where: {
                code: bind_code.toUpperCase(),
                used: false,
                expiresAt: { gt: new Date() },
            },
            include: { device: true },
        });

        if (!bindCode) {
            throw new ValidationError('Invalid or expired bind code');
        }

        // Check if device is already bound to another user
        if (bindCode.device.ownerId && bindCode.device.ownerId !== userReq.user.id) {
            throw new ForbiddenError('Device is already bound to another user');
        }

        // Generate device token
        const deviceToken = generateDeviceToken();
        const tokenHash = hashDeviceToken(deviceToken);

        // Update device and mark code as used (in transaction)
        await prisma.$transaction([
            prisma.device.update({
                where: { id: bindCode.deviceId },
                data: {
                    ownerId: userReq.user.id,
                    deviceToken: tokenHash,
                    tokenRevoked: false,
                    // Store raw token temporarily for device pickup
                    pendingToken: deviceToken,
                },
            }),
            prisma.bindCode.update({
                where: { id: bindCode.id },
                data: { used: true },
            }),
            // Create activity log
            prisma.activityLog.upsert({
                where: { deviceId: bindCode.deviceId },
                create: { deviceId: bindCode.deviceId },
                update: {},
            }),
            // Create default AI config
            prisma.aIConfig.upsert({
                where: { deviceId: bindCode.deviceId },
                create: {
                    deviceId: bindCode.deviceId,
                    provider: 'OPENAI',
                    model: 'gpt-4o-mini',
                    maxChars: 2500,
                    temperature: 0.3,
                },
                update: {},
            }),
        ]);

        log.device.bind(bindCode.device.deviceId, 'confirm');

        res.json({
            success: true,
            data: {
                status: 'bound',
                device_id: bindCode.device.deviceId,
            },
        });
    })
);

export default router;
