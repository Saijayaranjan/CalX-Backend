// =============================================================================
// CalX Backend - Web Chat Routes
// =============================================================================
// Web dashboard chat message sending.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateUser, requireDeviceOwnership } from '../../middleware/auth.js';
import { validateChatContent } from '../../middleware/validatePayload.js';
import { webChatSendSchema } from '../../utils/validators.js';
import { sendMessageFromWeb, getAllMessages } from '../../services/chat.service.js';
import { ValidationError } from '../../types/index.js';

const router = Router();

// =============================================================================
// POST /web/chat/send
// =============================================================================
// User sends a chat message to their device.

router.post(
    '/send',
    authenticateUser,
    validateChatContent,
    requireDeviceOwnership('device_id'),
    asyncHandler(async (req, res) => {
        // Validate input
        const result = webChatSendSchema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { device_id, content } = result.data;

        // Send message
        const message = await sendMessageFromWeb(device_id, content);

        res.status(201).json({
            success: true,
            data: message,
        });
    })
);

// =============================================================================
// GET /web/chat/:deviceId
// =============================================================================
// User fetches all chat messages for a device.

router.get(
    '/:deviceId',
    authenticateUser,
    asyncHandler(async (req, res) => {
        const { deviceId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        // Get messages (ownership check happens in service via device lookup)
        const messages = await getAllMessages(deviceId, page, limit);

        res.json({
            success: true,
            data: messages,
        });
    })
);

export default router;
