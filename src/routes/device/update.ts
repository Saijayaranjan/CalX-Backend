// =============================================================================
// CalX Backend - Device Update Routes
// =============================================================================
// Device OTA update check and download.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateDevice } from '../../middleware/auth.js';
import { updateDownloadQuerySchema } from '../../utils/validators.js';
import { checkForUpdates, downloadFirmware, reportOTAResult } from '../../services/ota.service.js';
import { ValidationError } from '../../types/index.js';
import type { AuthenticatedDeviceRequest } from '../../types/index.js';

const router = Router();

// =============================================================================
// GET /device/update/check
// =============================================================================
// Device checks if a firmware update is available.

router.get(
    '/check',
    authenticateDevice,
    asyncHandler(async (req, res) => {
        const deviceReq = req as AuthenticatedDeviceRequest;

        // Check for updates
        const update = await checkForUpdates(deviceReq.device.id);

        res.json(update);
    })
);

// =============================================================================
// GET /device/update/download
// =============================================================================
// Device downloads firmware. Battery check enforced.

router.get(
    '/download',
    authenticateDevice,
    asyncHandler(async (req, res) => {
        const deviceReq = req as AuthenticatedDeviceRequest;

        // Validate query params
        const result = updateDownloadQuerySchema.safeParse(req.query);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { version } = result.data;

        // Get download info (battery check happens in service)
        const download = await downloadFirmware(deviceReq.device.id, version);

        // Return signed URL or redirect to storage
        res.json({
            download_url: download.storagePath,
            checksum: download.checksum,
            file_size: download.fileSize,
        });
    })
);

// =============================================================================
// POST /device/update/report
// =============================================================================
// Device reports OTA result (success or failure).

router.post(
    '/report',
    authenticateDevice,
    asyncHandler(async (req, res) => {
        const deviceReq = req as AuthenticatedDeviceRequest;

        const { version, success } = req.body;

        if (!version || typeof success !== 'boolean') {
            throw new ValidationError('Version and success status required');
        }

        await reportOTAResult(deviceReq.device.id, version, success);

        res.json({ success: true });
    })
);

export default router;
