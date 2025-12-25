// =============================================================================
// CalX Backend - Device Service
// =============================================================================
// Device management, binding, heartbeat, and settings.
// =============================================================================

import { prisma } from '../lib/prisma.js';
import {
    generateBindCode,
    generateDeviceToken,
    hashDeviceToken,
} from '../utils/crypto.js';
import { config } from '../config/env.js';
import { log } from '../utils/logger.js';
import {
    NotFoundError,
    ValidationError,
    ForbiddenError,
} from '../types/index.js';
import type {
    BindRequestResponse,
    BindStatusResponse,
    BindConfirmResponse,
    DeviceSettingsResponse,
} from '../types/index.js';
import type { PowerMode, TextSize, KeyboardType, AIProvider } from '@prisma/client';

// =============================================================================
// Device Binding - Request Code
// =============================================================================

export async function requestBindCode(deviceId: string): Promise<BindRequestResponse> {
    // Check if device exists; if not, create it
    let device = await prisma.device.findUnique({
        where: { deviceId },
    });

    if (!device) {
        // Create new device record
        device = await prisma.device.create({
            data: {
                deviceId,
                macAddress: deviceId.replace('calx_', ''), // Extract MAC from device ID
            },
        });
    }

    // Invalidate any existing unused bind codes for this device
    await prisma.bindCode.updateMany({
        where: {
            deviceId: device.id,
            used: false,
        },
        data: {
            used: true, // Mark as used to invalidate
        },
    });

    // Generate new bind code
    const code = generateBindCode(4);
    const expiresAt = new Date(Date.now() + config.limits.bindCodeTTL * 1000);

    await prisma.bindCode.create({
        data: {
            code,
            deviceId: device.id,
            expiresAt,
        },
    });

    log.device.bind(deviceId, 'request');

    return {
        bind_code: code,
        expires_in: config.limits.bindCodeTTL,
    };
}

// =============================================================================
// Device Binding - Confirm (User)
// =============================================================================

export async function confirmBind(
    userId: string,
    bindCode: string
): Promise<BindConfirmResponse> {
    // Find valid, unused bind code
    const code = await prisma.bindCode.findFirst({
        where: {
            code: bindCode.toUpperCase(),
            used: false,
            expiresAt: { gt: new Date() },
        },
        include: {
            device: true,
        },
    });

    if (!code) {
        throw new ValidationError('Invalid or expired bind code');
    }

    // Check if device is already bound to another user
    if (code.device.ownerId && code.device.ownerId !== userId) {
        throw new ForbiddenError('Device is already bound to another user');
    }

    // Generate device token
    const deviceToken = generateDeviceToken();
    const tokenHash = hashDeviceToken(deviceToken);

    // Update device and mark code as used (in transaction)
    await prisma.$transaction([
        prisma.device.update({
            where: { id: code.deviceId },
            data: {
                ownerId: userId,
                deviceToken: tokenHash,
                tokenRevoked: false,
            },
        }),
        prisma.bindCode.update({
            where: { id: code.id },
            data: { used: true },
        }),
        // Create activity log for the device
        prisma.activityLog.upsert({
            where: { deviceId: code.deviceId },
            create: { deviceId: code.deviceId },
            update: {},
        }),
        // Create default AI config for the device
        prisma.aIConfig.upsert({
            where: { deviceId: code.deviceId },
            create: {
                deviceId: code.deviceId,
                provider: 'OPENAI',
                model: 'gpt-4o-mini',
                maxChars: 2500,
                temperature: 0.3,
            },
            update: {},
        }),
    ]);

    log.device.bind(code.device.deviceId, 'confirm');

    // Store token temporarily for device to fetch (in a real scenario, 
    // you might want a separate table for pending tokens)
    // For now, we'll return success and device will poll for token

    return {
        status: 'bound',
        device_id: code.device.deviceId,
    };
}

// =============================================================================
// Device Binding - Status Check
// =============================================================================

// Store pending tokens temporarily (in production, use Redis or DB)
const pendingTokens = new Map<string, string>();

export async function getBindStatus(deviceId: string): Promise<BindStatusResponse> {
    const device = await prisma.device.findUnique({
        where: { deviceId },
        select: {
            id: true,
            ownerId: true,
            deviceToken: true,
        },
    });

    if (!device) {
        return { bound: false };
    }

    if (!device.ownerId || !device.deviceToken) {
        return { bound: false };
    }

    // Check if we have a pending token to deliver
    const pendingToken = pendingTokens.get(deviceId);

    if (pendingToken) {
        // Delete pending token after delivery (one-time)
        pendingTokens.delete(deviceId);
        log.device.bind(deviceId, 'complete');

        return {
            bound: true,
            device_token: pendingToken,
        };
    }

    // Device is bound but token already delivered
    return { bound: true };
}

// Helper to store pending token for device delivery
export function storePendingToken(deviceId: string, token: string): void {
    pendingTokens.set(deviceId, token);
}

// =============================================================================
// Device Heartbeat
// =============================================================================

export async function processHeartbeat(
    deviceDbId: string,
    data: {
        batteryPercent: number;
        powerMode: PowerMode;
        firmwareVersion: string;
    }
): Promise<void> {
    const device = await prisma.device.update({
        where: { id: deviceDbId },
        data: {
            batteryPercent: data.batteryPercent,
            powerMode: data.powerMode,
            firmwareVersion: data.firmwareVersion,
            lastSeen: new Date(),
            online: true,
        },
        select: { deviceId: true },
    });

    log.device.heartbeat(device.deviceId, data.batteryPercent, data.powerMode);
}

// =============================================================================
// Get Device Settings
// =============================================================================

export async function getDeviceSettings(deviceDbId: string): Promise<DeviceSettingsResponse> {
    const device = await prisma.device.findUnique({
        where: { id: deviceDbId },
        include: {
            aiConfig: true,
        },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    return {
        power_mode: device.powerMode,
        text_size: device.textSize,
        keyboard: device.keyboard,
        screen_timeout: device.screenTimeout,
        ai_config: device.aiConfig
            ? {
                provider: device.aiConfig.provider,
                model: device.aiConfig.model,
                max_chars: device.aiConfig.maxChars,
                temperature: device.aiConfig.temperature,
            }
            : null,
    };
}

// =============================================================================
// Update Device Settings (Web)
// =============================================================================

export async function updateDeviceSettings(
    deviceId: string,
    settings: {
        powerMode?: PowerMode;
        textSize?: TextSize;
        keyboard?: KeyboardType;
        screenTimeout?: number;
        aiConfig?: {
            provider?: AIProvider;
            model?: string;
            maxChars?: number;
            temperature?: number;
            apiKey?: string;
        };
    }
): Promise<void> {
    const device = await prisma.device.findUnique({
        where: { deviceId },
        select: { id: true },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    // Update device settings
    await prisma.device.update({
        where: { id: device.id },
        data: {
            ...(settings.powerMode && { powerMode: settings.powerMode }),
            ...(settings.textSize && { textSize: settings.textSize }),
            ...(settings.keyboard && { keyboard: settings.keyboard }),
            ...(settings.screenTimeout && { screenTimeout: settings.screenTimeout }),
        },
    });

    // Update AI config if provided
    if (settings.aiConfig) {
        await prisma.aIConfig.upsert({
            where: { deviceId: device.id },
            create: {
                deviceId: device.id,
                provider: settings.aiConfig.provider || 'OPENAI',
                model: settings.aiConfig.model || 'gpt-4o-mini',
                maxChars: settings.aiConfig.maxChars || 2500,
                temperature: settings.aiConfig.temperature || 0.3,
                apiKey: settings.aiConfig.apiKey,
            },
            update: {
                ...(settings.aiConfig.provider && { provider: settings.aiConfig.provider }),
                ...(settings.aiConfig.model && { model: settings.aiConfig.model }),
                ...(settings.aiConfig.maxChars && { maxChars: settings.aiConfig.maxChars }),
                ...(settings.aiConfig.temperature !== undefined && { temperature: settings.aiConfig.temperature }),
                ...(settings.aiConfig.apiKey && { apiKey: settings.aiConfig.apiKey }),
            },
        });
    }
}

// =============================================================================
// Revoke Device Token
// =============================================================================

export async function revokeDeviceToken(deviceId: string): Promise<void> {
    await prisma.device.update({
        where: { deviceId },
        data: {
            tokenRevoked: true,
        },
    });
}

// =============================================================================
// Get Device Activity Log
// =============================================================================

export async function getDeviceActivity(deviceId: string) {
    const device = await prisma.device.findUnique({
        where: { deviceId },
        include: {
            activityLog: true,
        },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    return {
        last_ai_query: device.activityLog?.lastAiQuery?.toISOString() || null,
        last_file_sync: device.activityLog?.lastFileSync?.toISOString() || null,
        last_chat_message: device.activityLog?.lastChatMessage?.toISOString() || null,
    };
}

// =============================================================================
// Update Online Status (for cron/cleanup)
// =============================================================================

export async function updateOnlineStatus(): Promise<void> {
    const normalThreshold = new Date(
        Date.now() - config.heartbeat.normalIntervalMs * config.heartbeat.onlineThresholdMultiplier
    );

    // Mark devices as offline if they haven't sent a heartbeat
    await prisma.device.updateMany({
        where: {
            online: true,
            lastSeen: { lt: normalThreshold },
        },
        data: {
            online: false,
        },
    });
}

// =============================================================================
// Get User's Devices
// =============================================================================

export async function getUserDevices(userId: string) {
    return prisma.device.findMany({
        where: { ownerId: userId },
        select: {
            id: true,
            deviceId: true,
            firmwareVersion: true,
            lastSeen: true,
            online: true,
            batteryPercent: true,
            powerMode: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    });
}
