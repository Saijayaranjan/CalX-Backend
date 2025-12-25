// =============================================================================
// CalX Backend - Prisma Client
// =============================================================================
// Singleton Prisma client instance with connection handling.
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { config } from '../config/env.js';
import { log } from '../utils/logger.js';

// Prisma client singleton
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: config.isDev
            ? [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'error' },
                { emit: 'stdout', level: 'warn' },
            ]
            : [{ emit: 'stdout', level: 'error' }],
    });

// Log queries in development
if (config.isDev) {
    prisma.$on('query' as never, (e: { query: string; duration: number }) => {
        log.debug(`Query: ${e.query}`, { duration_ms: e.duration });
    });
}

// Prevent multiple instances in development (hot reload)
if (!config.isProd) {
    globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

export default prisma;
