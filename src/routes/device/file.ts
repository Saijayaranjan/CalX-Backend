// =============================================================================
// CalX Backend - Device File Routes
// =============================================================================
// Device fetches its TXT file.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateDevice } from '../../middleware/auth.js';
import { getFile } from '../../services/file.service.js';
import type { AuthenticatedDeviceRequest } from '../../types/index.js';

const router = Router();

// =============================================================================
// GET /device/file
// =============================================================================
// Device fetches its current TXT file content.

router.get(
    '/',
    authenticateDevice,
    asyncHandler(async (req, res) => {
        const deviceReq = req as AuthenticatedDeviceRequest;

        // Get file
        const file = await getFile(deviceReq.device.id);

        if (!file) {
            res.json({ content: '', char_count: 0 });
            return;
        }

        res.json(file);
    })
);

export default router;
