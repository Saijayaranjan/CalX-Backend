// =============================================================================
// CalX Backend - Web File Routes
// =============================================================================
// Web dashboard file upload.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateUser, requireDeviceOwnership } from '../../middleware/auth.js';
import { validateFileContent } from '../../middleware/validatePayload.js';
import { fileUploadSchema } from '../../utils/validators.js';
import { uploadFile, deleteFile } from '../../services/file.service.js';
import { ValidationError } from '../../types/index.js';

const router = Router();

// =============================================================================
// POST /web/file/upload
// =============================================================================
// User uploads a TXT file to their device.

router.post(
    '/upload',
    authenticateUser,
    validateFileContent,
    requireDeviceOwnership('device_id'),
    asyncHandler(async (req, res) => {
        // Validate input
        const result = fileUploadSchema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { device_id, content } = result.data;

        // Upload file
        const file = await uploadFile(device_id, content);

        res.json({
            success: true,
            data: file,
        });
    })
);

// =============================================================================
// DELETE /web/file/:deviceId
// =============================================================================
// User deletes the file from their device.

router.delete(
    '/:deviceId',
    authenticateUser,
    asyncHandler(async (req, res) => {
        const { deviceId } = req.params;

        // Delete file
        await deleteFile(deviceId);

        res.json({ success: true });
    })
);

export default router;
