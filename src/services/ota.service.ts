// =============================================================================
// CalX Backend - OTA Service
// =============================================================================
// Firmware update management with battery gating and dual-partition safety.
// =============================================================================

import { prisma } from '../lib/prisma.js';
import { log } from '../utils/logger.js';
import {
    NotFoundError,
    ForbiddenError,
    ValidationError,
} from '../types/index.js';
import type { UpdateCheckResponse } from '../types/index.js';

// =============================================================================
// Constants
// =============================================================================

const MIN_BATTERY_FOR_OTA = 30; // Minimum battery percentage for OTA

// =============================================================================
// Check for Updates (Device)
// =============================================================================

export async function checkForUpdates(deviceDbId: string): Promise<UpdateCheckResponse> {
    const device = await prisma.device.findUnique({
        where: { id: deviceDbId },
        select: {
            firmwareVersion: true,
        },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    // Find latest firmware
    const latestFirmware = await prisma.firmware.findFirst({
        orderBy: { createdAt: 'desc' },
        select: {
            version: true,
            checksum: true,
            fileSize: true,
        },
    });

    if (!latestFirmware) {
        return { available: false };
    }

    // Compare versions
    if (isNewerVersion(latestFirmware.version, device.firmwareVersion)) {
        return {
            available: true,
            version: latestFirmware.version,
            checksum: latestFirmware.checksum,
            file_size: latestFirmware.fileSize,
        };
    }

    return { available: false };
}

// =============================================================================
// Trigger OTA Update (Web)
// =============================================================================

export async function triggerOTAUpdate(
    deviceId: string,
    firmwareId: string
): Promise<{ jobId: string }> {
    // Get device with current battery level
    const device = await prisma.device.findUnique({
        where: { deviceId },
        select: {
            id: true,
            deviceId: true,
            batteryPercent: true,
            online: true,
        },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    // Check battery level
    if (device.batteryPercent <= MIN_BATTERY_FOR_OTA) {
        throw new ForbiddenError(
            `Battery too low for OTA. Current: ${device.batteryPercent}%, Required: >${MIN_BATTERY_FOR_OTA}%`
        );
    }

    // Verify firmware exists
    const firmware = await prisma.firmware.findUnique({
        where: { id: firmwareId },
        select: { id: true, version: true },
    });

    if (!firmware) {
        throw new NotFoundError('Firmware not found');
    }

    // Create OTA job
    const job = await prisma.oTAJob.create({
        data: {
            deviceId: device.id,
            firmwareId: firmware.id,
            status: 'PENDING',
        },
    });

    log.device.ota(device.deviceId, firmware.version, 'PENDING');

    return { jobId: job.id };
}

// =============================================================================
// Download Firmware (Device)
// =============================================================================

export async function downloadFirmware(
    deviceDbId: string,
    version: string
): Promise<{
    storagePath: string;
    checksum: string;
    fileSize: number;
}> {
    // Get device with battery level
    const device = await prisma.device.findUnique({
        where: { id: deviceDbId },
        select: {
            id: true,
            deviceId: true,
            batteryPercent: true,
            online: true,
        },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    // Check battery level
    if (device.batteryPercent <= MIN_BATTERY_FOR_OTA) {
        throw new ForbiddenError('Battery too low for OTA');
    }

    // Get firmware
    const firmware = await prisma.firmware.findUnique({
        where: { version },
        select: {
            id: true,
            storagePath: true,
            checksum: true,
            fileSize: true,
        },
    });

    if (!firmware) {
        throw new NotFoundError('Firmware version not found');
    }

    // Update OTA job status if exists
    await prisma.oTAJob.updateMany({
        where: {
            deviceId: device.id,
            firmwareId: firmware.id,
            status: 'PENDING',
        },
        data: {
            status: 'DOWNLOADING',
        },
    });

    log.device.ota(device.deviceId, version, 'DOWNLOADING');

    return {
        storagePath: firmware.storagePath,
        checksum: firmware.checksum,
        fileSize: firmware.fileSize,
    };
}

// =============================================================================
// Update OTA Job Status
// =============================================================================

export async function updateOTAJobStatus(
    jobId: string,
    status: 'SUCCESS' | 'FAILED' | 'ROLLED_BACK'
): Promise<void> {
    const job = await prisma.oTAJob.findUnique({
        where: { id: jobId },
        include: {
            device: { select: { deviceId: true } },
            firmware: { select: { version: true } },
        },
    });

    if (!job) {
        throw new NotFoundError('OTA job not found');
    }

    await prisma.oTAJob.update({
        where: { id: jobId },
        data: { status },
    });

    log.device.ota(job.device.deviceId, job.firmware.version, status);
}

// =============================================================================
// Report OTA Result (Device)
// =============================================================================

export async function reportOTAResult(
    deviceDbId: string,
    version: string,
    success: boolean
): Promise<void> {
    const device = await prisma.device.findUnique({
        where: { id: deviceDbId },
        select: { id: true, deviceId: true },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    const firmware = await prisma.firmware.findUnique({
        where: { version },
        select: { id: true },
    });

    if (!firmware) {
        throw new NotFoundError('Firmware not found');
    }

    // Update the most recent OTA job for this device/firmware
    await prisma.oTAJob.updateMany({
        where: {
            deviceId: device.id,
            firmwareId: firmware.id,
            status: 'DOWNLOADING',
        },
        data: {
            status: success ? 'SUCCESS' : 'FAILED',
        },
    });

    // If successful, update device firmware version
    if (success) {
        await prisma.device.update({
            where: { id: device.id },
            data: { firmwareVersion: version },
        });
    }

    log.device.ota(device.deviceId, version, success ? 'SUCCESS' : 'FAILED');
}

// =============================================================================
// Get OTA Jobs for Device
// =============================================================================

export async function getOTAJobs(deviceId: string) {
    const device = await prisma.device.findUnique({
        where: { deviceId },
        select: { id: true },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    return prisma.oTAJob.findMany({
        where: { deviceId: device.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
            firmware: {
                select: {
                    version: true,
                    notes: true,
                },
            },
        },
    });
}

// =============================================================================
// Add Firmware (Admin)
// =============================================================================

export async function addFirmware(data: {
    version: string;
    storagePath: string;
    checksum: string;
    fileSize: number;
    notes?: string;
}): Promise<{ id: string }> {
    // Check if version already exists
    const existing = await prisma.firmware.findUnique({
        where: { version: data.version },
    });

    if (existing) {
        throw new ValidationError(`Firmware version ${data.version} already exists`);
    }

    const firmware = await prisma.firmware.create({
        data: {
            version: data.version,
            storagePath: data.storagePath,
            checksum: data.checksum,
            fileSize: data.fileSize,
            notes: data.notes,
        },
    });

    return { id: firmware.id };
}

// =============================================================================
// List Firmware Versions
// =============================================================================

export async function listFirmware() {
    return prisma.firmware.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            version: true,
            fileSize: true,
            notes: true,
            createdAt: true,
        },
    });
}

// =============================================================================
// Helper: Compare Versions
// =============================================================================

function isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const parseVersion = (v: string): number[] => {
        return v.split('.').map((n) => parseInt(n, 10) || 0);
    };

    const newParts = parseVersion(newVersion);
    const currentParts = parseVersion(currentVersion);

    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
        const newPart = newParts[i] || 0;
        const currentPart = currentParts[i] || 0;

        if (newPart > currentPart) return true;
        if (newPart < currentPart) return false;
    }

    return false; // Versions are equal
}
