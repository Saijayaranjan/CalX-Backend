// =============================================================================
// CalX Backend - Web Device Routes
// =============================================================================
// Web dashboard device management: settings, activity log.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateUser, requireDeviceOwnership } from '../../middleware/auth.js';
import { deviceSettingsSchema } from '../../utils/validators.js';
import {
    updateDeviceSettings,
    getDeviceActivity,
    revokeDeviceToken,
    getUserDevices,
} from '../../services/device.service.js';
import { ValidationError } from '../../types/index.js';
import type { AuthenticatedUserRequest } from '../../types/index.js';

const router = Router();

// =============================================================================
// GET /web/device/list
// =============================================================================
// User gets list of their devices.

router.get(
    '/list',
    authenticateUser,
    asyncHandler(async (req, res) => {
        const userReq = req as AuthenticatedUserRequest;

        const devices = await getUserDevices(userReq.user.id);

        res.json({
            success: true,
            data: { devices },
        });
    })
);

// =============================================================================
// POST /web/device/settings
// =============================================================================
// User updates device settings.

router.post(
    '/settings',
    authenticateUser,
    requireDeviceOwnership('device_id'),
    asyncHandler(async (req, res) => {
        // Validate input
        const result = deviceSettingsSchema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { device_id, power_mode, text_size, keyboard, screen_timeout, ai_config } = result.data;

        // Update settings
        await updateDeviceSettings(device_id, {
            powerMode: power_mode as 'NORMAL' | 'LOW' | undefined,
            textSize: text_size as 'SMALL' | 'NORMAL' | 'LARGE' | undefined,
            keyboard: keyboard as 'QWERTY' | 'T9' | undefined,
            screenTimeout: screen_timeout,
            aiConfig: ai_config
                ? {
                    provider: ai_config.provider as any,
                    model: ai_config.model,
                    maxChars: ai_config.max_chars,
                    temperature: ai_config.temperature,
                    apiKey: ai_config.api_key,
                }
                : undefined,
        });

        res.json({ success: true });
    })
);

// =============================================================================
// GET /web/device/:id/activity
// =============================================================================
// User gets device activity log.

router.get(
    '/:id/activity',
    authenticateUser,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Get activity log
        const activity = await getDeviceActivity(id);

        res.json({
            success: true,
            data: activity,
        });
    })
);

// =============================================================================
// POST /web/device/:id/revoke-token
// =============================================================================
// User revokes device token (force rebind).

router.post(
    '/:id/revoke-token',
    authenticateUser,
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Revoke token
        await revokeDeviceToken(id);

        res.json({ success: true });
    })
);

export default router;
