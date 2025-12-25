// =============================================================================
// CalX Backend - Crypto Utilities
// =============================================================================
// Token generation, hashing, and secure random functions.
// =============================================================================

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// =============================================================================
// Password Hashing (bcrypt)
// =============================================================================

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// =============================================================================
// JWT Token Generation
// =============================================================================

export interface JWTPayload {
    userId: string;
    email: string;
}

export function generateJWT(payload: JWTPayload): string {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn as string,
    } as jwt.SignOptions);
}

export function verifyJWT(token: string): JWTPayload {
    return jwt.verify(token, config.jwt.secret) as JWTPayload;
}

// =============================================================================
// Device Token Generation
// =============================================================================

/**
 * Generate a cryptographically secure device token.
 * Format: dev_tok_<32 random hex chars>
 */
export function generateDeviceToken(): string {
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `dev_tok_${randomBytes}`;
}

/**
 * Hash a device token for secure storage.
 * Uses HMAC-SHA256 with the device token secret.
 */
export function hashDeviceToken(token: string): string {
    return crypto.createHmac('sha256', config.deviceToken.secret).update(token).digest('hex');
}

/**
 * Verify a device token against a stored hash.
 */
export function verifyDeviceToken(token: string, storedHash: string): boolean {
    const hash = hashDeviceToken(token);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

// =============================================================================
// Bind Code Generation
// =============================================================================

/**
 * Generate a short alphanumeric bind code.
 * Uses uppercase letters and numbers (excluding ambiguous characters).
 */
export function generateBindCode(length: number = 4): string {
    // Exclude ambiguous characters: 0, O, I, 1, L
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';

    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        code += chars[randomBytes[i] % chars.length];
    }

    return code;
}

// =============================================================================
// Query ID Generation (for AI chunks)
// =============================================================================

export function generateQueryId(): string {
    return `query_${crypto.randomBytes(12).toString('hex')}`;
}

// =============================================================================
// Checksum Generation (for firmware)
// =============================================================================

export function generateSHA256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

// =============================================================================
// UUID Generation
// =============================================================================

export function generateUUID(): string {
    return crypto.randomUUID();
}
