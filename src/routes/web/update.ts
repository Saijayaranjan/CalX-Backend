// =============================================================================
// CalX Backend - Web Update Routes
// =============================================================================
// Web dashboard OTA update management.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateUser, requireDeviceOwnership } from '../../middleware/auth.js';
import { triggerOTASchema } from '../../utils/validators.js';
import {
    triggerOTAUpdate,
    getOTAJobs,
    listFirmware,
    addFirmware,
} from '../../services/ota.service.js';
import { ValidationError } from '../../types/index.js';

const router = Router();

// =============================================================================
// POST /web/device/update
// =============================================================================
// User triggers OTA update for their device.

router.post(
    '/',
    authenticateUser,
    requireDeviceOwnership('device_id'),
    asyncHandler(async (req, res) => {
        // Validate input
        const result = triggerOTASchema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { device_id, firmware_id } = result.data;

        // Trigger OTA (battery check happens in service)
        const job = await triggerOTAUpdate(device_id, firmware_id);

        res.json({
            success: true,
            data: { job_id: job.jobId },
        });
    })
);

// =============================================================================
// GET /web/device/:id/updates
// =============================================================================
// User gets OTA job history for a device.

router.get(
    '/:id/updates',
    authenticateUser,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Get OTA jobs
        const jobs = await getOTAJobs(id);

        res.json({
            success: true,
            data: { jobs },
        });
    })
);

// =============================================================================
// GET /web/firmware
// =============================================================================
// List available firmware versions.

router.get(
    '/firmware',
    authenticateUser,
    asyncHandler(async (_req, res) => {
        const firmware = await listFirmware();

        res.json({
            success: true,
            data: { firmware },
        });
    })
);

// =============================================================================
// POST /web/firmware
// =============================================================================
// Admin adds new firmware version.
// TODO: Add admin-only middleware

router.post(
    '/firmware',
    authenticateUser,
    asyncHandler(async (req, res) => {
        const { version, storage_path, checksum, file_size, notes } = req.body;

        if (!version || !storage_path || !checksum || !file_size) {
            throw new ValidationError('Missing required firmware fields');
        }

        const result = await addFirmware({
            version,
            storagePath: storage_path,
            checksum,
            fileSize: file_size,
            notes,
        });

        res.status(201).json({
            success: true,
            data: result,
        });
    })
);

export default router;
