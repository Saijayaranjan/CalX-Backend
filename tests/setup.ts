// =============================================================================
// CalX Backend - Test Setup
// =============================================================================
// Jest test configuration and utilities.
// =============================================================================

import { PrismaClient } from '@prisma/client';

// Mock Prisma for unit tests
jest.mock('../src/lib/prisma', () => ({
    prisma: new PrismaClient(),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/calx_test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';
process.env.DEVICE_TOKEN_SECRET = 'test-device-token-secret-32-chars';
process.env.JWT_EXPIRES_IN = '7d';

// Global test timeout
jest.setTimeout(10000);

// Clean up after all tests
afterAll(async () => {
    // Add any cleanup logic here
});
