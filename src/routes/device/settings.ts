// =============================================================================
// CalX Backend - Device Settings Routes
// =============================================================================
// Device fetches its settings and configuration.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateDevice } from '../../middleware/auth.js';
import { getDeviceSettings } from '../../services/device.service.js';
import type { AuthenticatedDeviceRequest } from '../../types/index.js';

const router = Router();

// =============================================================================
// GET /device/settings
// =============================================================================
// Device fetches its current settings including AI config.

router.get(
    '/',
    authenticateDevice,
    asyncHandler(async (req, res) => {
        const deviceReq = req as AuthenticatedDeviceRequest;

        // Get settings
        const settings = await getDeviceSettings(deviceReq.device.id);

        res.json(settings);
    })
);

export default router;
