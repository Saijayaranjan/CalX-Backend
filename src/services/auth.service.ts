// =============================================================================
// CalX Backend - Auth Service
// =============================================================================
// User registration, login, and token management.
// =============================================================================

import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword, generateJWT } from '../utils/crypto.js';
import { log } from '../utils/logger.js';
import { ValidationError, UnauthorizedError } from '../types/index.js';
import type { LoginResponse } from '../types/index.js';

// =============================================================================
// User Registration
// =============================================================================

export async function registerUser(email: string, password: string): Promise<{ userId: string }> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });

    if (existingUser) {
        throw new ValidationError('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
        data: {
            email: email.toLowerCase(),
            passwordHash,
        },
    });

    log.auth.register(user.email);

    return { userId: user.id };
}

// =============================================================================
// User Login
// =============================================================================

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
    // Find user
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });

    if (!user) {
        log.auth.login(email, false);
        throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
        log.auth.login(email, false);
        throw new UnauthorizedError('Invalid email or password');
    }

    // Generate JWT
    const token = generateJWT({
        userId: user.id,
        email: user.email,
    });

    log.auth.login(email, true);

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
        },
    };
}

// =============================================================================
// Get User by ID
// =============================================================================

export async function getUserById(userId: string) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            createdAt: true,
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
