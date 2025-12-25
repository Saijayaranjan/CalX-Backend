// =============================================================================
// CalX Backend - Device AI Routes
// =============================================================================
// Device AI query and continuation.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateDevice } from '../../middleware/auth.js';
import { validateAIInput } from '../../middleware/validatePayload.js';
import { aiQuerySchema, aiContinueQuerySchema } from '../../utils/validators.js';
import { processAIQuery, continueAIQuery } from '../../services/ai.service.js';
import { ValidationError } from '../../types/index.js';
import type { AuthenticatedDeviceRequest } from '../../types/index.js';

const router = Router();

// =============================================================================
// POST /device/ai/query
// =============================================================================
// Device sends AI query. Returns first chunk and cursor for continuation.

router.post(
    '/query',
    authenticateDevice,
    validateAIInput,
    asyncHandler(async (req, res) => {
        const deviceReq = req as AuthenticatedDeviceRequest;

        // Validate input
        const result = aiQuerySchema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { prompt } = result.data;

        // Process AI query
        const response = await processAIQuery(deviceReq.device.id, prompt);

        res.json(response);
    })
);

// =============================================================================
// GET /device/ai/continue
// =============================================================================
// Device fetches next chunk of AI response.

router.get(
    '/continue',
    authenticateDevice,
    asyncHandler(async (req, res) => {
        // Validate query params
        const result = aiContinueQuerySchema.safeParse(req.query);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { cursor } = result.data;

        // Get next chunk
        const response = await continueAIQuery(cursor);

        res.json(response);
    })
);

export default router;
