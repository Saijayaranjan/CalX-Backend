// =============================================================================
// CalX Backend - Web Bind Routes
// =============================================================================
// User confirms device binding.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateUser } from '../../middleware/auth.js';
import { bindConfirmSchema } from '../../utils/validators.js';
import { confirmBind, storePendingToken } from '../../services/device.service.js';
import { generateDeviceToken, hashDeviceToken } from '../../utils/crypto.js';
import { prisma } from '../../lib/prisma.js';
import { ValidationError } from '../../types/index.js';
import type { AuthenticatedUserRequest } from '../../types/index.js';

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

        // First, get the device info from the bind code
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

        // Generate device token BEFORE confirming bind
        const deviceToken = generateDeviceToken();
        const tokenHash = hashDeviceToken(deviceToken);

        // Update device with the token hash
        await prisma.device.update({
            where: { id: bindCode.deviceId },
            data: {
                deviceToken: tokenHash,
            },
        });

        // Store the raw token for device to fetch (one-time delivery)
        storePendingToken(bindCode.device.deviceId, deviceToken);

        // Confirm binding
        const bindResponse = await confirmBind(userReq.user.id, bind_code);

        res.json({
            success: true,
            data: bindResponse,
        });
    })
);

export default router;
