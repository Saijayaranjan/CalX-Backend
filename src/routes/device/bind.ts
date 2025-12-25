// =============================================================================
// CalX Backend - Device Bind Routes
// =============================================================================
// Device binding flow: request code, check status.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { bindRequestSchema, bindStatusQuerySchema } from '../../utils/validators.js';
import { requestBindCode, getBindStatus } from '../../services/device.service.js';
import { ValidationError } from '../../types/index.js';

const router = Router();

// =============================================================================
// POST /device/bind/request
// =============================================================================
// Device requests a bind code. No auth required.

router.post(
    '/request',
    asyncHandler(async (req, res) => {
        // Validate input
        const result = bindRequestSchema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { device_id } = result.data;

        // Generate bind code
        const bindResponse = await requestBindCode(device_id);

        res.json(bindResponse);
    })
);

// =============================================================================
// GET /device/bind/status
// =============================================================================
// Device polls for binding status. No auth required (uses device_id query).

router.get(
    '/status',
    asyncHandler(async (req, res) => {
        // Validate query params
        const result = bindStatusQuerySchema.safeParse(req.query);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { device_id } = result.data;

        // Check status
        const status = await getBindStatus(device_id);

        res.json(status);
    })
);

export default router;
