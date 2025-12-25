// =============================================================================
// CalX Backend - Device Chat Routes
// =============================================================================
// Device chat message send and fetch.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateDevice } from '../../middleware/auth.js';
import { validateChatContent } from '../../middleware/validatePayload.js';
import { chatSendSchema, chatQuerySchema } from '../../utils/validators.js';
import { sendMessageFromDevice, getMessages } from '../../services/chat.service.js';
import { ValidationError } from '../../types/index.js';
import type { AuthenticatedDeviceRequest } from '../../types/index.js';

const router = Router();

// =============================================================================
// GET /device/chat
// =============================================================================
// Device fetches chat messages. Supports `since` parameter for incremental fetch.

router.get(
    '/',
    authenticateDevice,
    asyncHandler(async (req, res) => {
        const deviceReq = req as AuthenticatedDeviceRequest;

        // Validate query params
        const result = chatQuerySchema.safeParse(req.query);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const since = result.data.since ? new Date(result.data.since) : undefined;

        // Get messages
        const messages = await getMessages(deviceReq.device.id, since);

        res.json(messages);
    })
);

// =============================================================================
// POST /device/chat/send
// =============================================================================
// Device sends a chat message.

router.post(
    '/send',
    authenticateDevice,
    validateChatContent,
    asyncHandler(async (req, res) => {
        const deviceReq = req as AuthenticatedDeviceRequest;

        // Validate input
        const result = chatSendSchema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { content } = result.data;

        // Send message
        const message = await sendMessageFromDevice(deviceReq.device.id, content);

        res.status(201).json(message);
    })
);

export default router;
