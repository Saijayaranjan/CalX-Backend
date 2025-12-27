// =============================================================================
// CalX Backend - Device Heartbeat Routes
// =============================================================================
// Device heartbeat for status reporting.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { authenticateDevice } from '../../middleware/auth.js';
import { heartbeatSchema } from '../../utils/validators.js';
import { processHeartbeat } from '../../services/device.service.js';
import { ValidationError } from '../../types/index.js';
import type { AuthenticatedDeviceRequest } from '../../types/index.js';

const router = Router();

// =============================================================================
// POST /device/heartbeat
// =============================================================================
// Device sends heartbeat with battery, power mode, firmware version.

router.post(
    '/',
    authenticateDevice,
    asyncHandler(async (req, res) => {
        const deviceReq = req as AuthenticatedDeviceRequest;

        // Validate input
        const result = heartbeatSchema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { battery_percent, power_mode, firmware_version, wifi_ssid, free_storage, free_ram } = result.data;

        // Process heartbeat
        await processHeartbeat(deviceReq.device.id, {
            batteryPercent: battery_percent,
            powerMode: power_mode,
            firmwareVersion: firmware_version,
            wifiSsid: wifi_ssid,
            freeStorage: free_storage,
            freeRam: free_ram,
        });

        res.json({ success: true });
    })
);

export default router;
