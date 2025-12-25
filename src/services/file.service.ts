// =============================================================================
// CalX Backend - File Service
// =============================================================================
// TXT file upload and retrieval (one file per device, max 4000 chars).
// =============================================================================

import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { log } from '../utils/logger.js';
import { NotFoundError, ValidationError, PayloadTooLargeError } from '../types/index.js';
import type { FileResponse } from '../types/index.js';

// =============================================================================
// Upload File (from web)
// =============================================================================

export async function uploadFile(
    deviceId: string,
    content: string
): Promise<FileResponse> {
    // Validate content length
    if (content.length > config.limits.fileMaxChars) {
        throw new PayloadTooLargeError(
            `File content exceeds maximum of ${config.limits.fileMaxChars} characters`
        );
    }

    // Validate it's plain text (no binary/special characters)
    if (!isPlainText(content)) {
        throw new ValidationError('File must contain only plain text');
    }

    const device = await prisma.device.findUnique({
        where: { deviceId },
        select: { id: true, deviceId: true },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    // Upsert file (one file per device)
    const file = await prisma.file.upsert({
        where: { deviceId: device.id },
        create: {
            deviceId: device.id,
            content,
            charCount: content.length,
        },
        update: {
            content,
            charCount: content.length,
        },
    });

    // Update activity log
    await prisma.activityLog.upsert({
        where: { deviceId: device.id },
        create: {
            deviceId: device.id,
            lastFileSync: new Date(),
        },
        update: {
            lastFileSync: new Date(),
        },
    });

    log.device.file(device.deviceId, content.length);

    return {
        content: file.content,
        char_count: file.charCount,
    };
}

// =============================================================================
// Get File (for device)
// =============================================================================

export async function getFile(deviceDbId: string): Promise<FileResponse | null> {
    const file = await prisma.file.findUnique({
        where: { deviceId: deviceDbId },
        select: {
            content: true,
            charCount: true,
        },
    });

    if (!file) {
        return null;
    }

    return {
        content: file.content,
        char_count: file.charCount,
    };
}

// =============================================================================
// Delete File
// =============================================================================

export async function deleteFile(deviceId: string): Promise<void> {
    const device = await prisma.device.findUnique({
        where: { deviceId },
        select: { id: true },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    await prisma.file.delete({
        where: { deviceId: device.id },
    }).catch(() => {
        // File might not exist, that's okay
    });
}

// =============================================================================
// Helper: Validate Plain Text
// =============================================================================

function isPlainText(content: string): boolean {
    // Allow printable ASCII, newlines, tabs, and common Unicode characters
    // Reject control characters (except \n, \r, \t) and null bytes
    const invalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
    return !invalidChars.test(content);
}
