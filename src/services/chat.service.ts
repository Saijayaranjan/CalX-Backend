// =============================================================================
// CalX Backend - Chat Service
// =============================================================================
// Chat message management between device and web dashboard.
// =============================================================================

import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { log } from '../utils/logger.js';
import { NotFoundError } from '../types/index.js';
import type { ChatMessageResponse, ChatListResponse } from '../types/index.js';

// =============================================================================
// Send Message (from device)
// =============================================================================

export async function sendMessageFromDevice(
    deviceDbId: string,
    content: string
): Promise<ChatMessageResponse> {
    const device = await prisma.device.findUnique({
        where: { id: deviceDbId },
        select: { id: true, deviceId: true },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    // Create message
    const message = await prisma.chatMessage.create({
        data: {
            deviceId: device.id,
            sender: 'DEVICE',
            content,
        },
    });

    // Update activity log
    await prisma.activityLog.upsert({
        where: { deviceId: device.id },
        create: {
            deviceId: device.id,
            lastChatMessage: new Date(),
        },
        update: {
            lastChatMessage: new Date(),
        },
    });

    log.device.chat(device.deviceId, 'DEVICE', content.length);

    return {
        id: message.id,
        sender: message.sender,
        content: message.content,
        created_at: message.createdAt.toISOString(),
    };
}

// =============================================================================
// Send Message (from web)
// =============================================================================

export async function sendMessageFromWeb(
    deviceId: string,
    content: string
): Promise<ChatMessageResponse> {
    const device = await prisma.device.findUnique({
        where: { deviceId },
        select: { id: true, deviceId: true },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    // Create message
    const message = await prisma.chatMessage.create({
        data: {
            deviceId: device.id,
            sender: 'WEB',
            content,
        },
    });

    // Update activity log
    await prisma.activityLog.upsert({
        where: { deviceId: device.id },
        create: {
            deviceId: device.id,
            lastChatMessage: new Date(),
        },
        update: {
            lastChatMessage: new Date(),
        },
    });

    log.device.chat(device.deviceId, 'WEB', content.length);

    return {
        id: message.id,
        sender: message.sender,
        content: message.content,
        created_at: message.createdAt.toISOString(),
    };
}

// =============================================================================
// Get Messages (for device polling)
// =============================================================================

export async function getMessages(
    deviceDbId: string,
    since?: Date
): Promise<ChatListResponse> {
    const device = await prisma.device.findUnique({
        where: { id: deviceDbId },
        select: { id: true },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    // Build query
    const whereClause: {
        deviceId: string;
        createdAt?: { gt: Date };
    } = {
        deviceId: device.id,
    };

    if (since) {
        whereClause.createdAt = { gt: since };
    }

    // Fetch messages with pagination
    const messages = await prisma.chatMessage.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
        take: config.limits.chatPageSize,
        select: {
            id: true,
            sender: true,
            content: true,
            createdAt: true,
        },
    });

    return {
        messages: messages.map((msg) => ({
            id: msg.id,
            sender: msg.sender,
            content: msg.content,
            created_at: msg.createdAt.toISOString(),
        })),
    };
}

// =============================================================================
// Get All Messages (for web dashboard)
// =============================================================================

export async function getAllMessages(
    deviceId: string,
    page: number = 1,
    limit: number = 50
): Promise<{
    messages: ChatMessageResponse[];
    total: number;
    page: number;
    pages: number;
}> {
    const device = await prisma.device.findUnique({
        where: { deviceId },
        select: { id: true },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
        prisma.chatMessage.findMany({
            where: { deviceId: device.id },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            select: {
                id: true,
                sender: true,
                content: true,
                createdAt: true,
            },
        }),
        prisma.chatMessage.count({
            where: { deviceId: device.id },
        }),
    ]);

    return {
        messages: messages.map((msg) => ({
            id: msg.id,
            sender: msg.sender,
            content: msg.content,
            created_at: msg.createdAt.toISOString(),
        })),
        total,
        page,
        pages: Math.ceil(total / limit),
    };
}
