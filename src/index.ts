// =============================================================================
// CalX Backend - Entry Point
// =============================================================================
// Application startup with graceful shutdown handling.
// =============================================================================

import app from './app.js';
import { config } from './config/env.js';
import { log } from './utils/logger.js';
import { prisma } from './lib/prisma.js';

// =============================================================================
// Start Server
// =============================================================================

const server = app.listen(config.port, () => {
    log.info('🚀 CalX Backend started', {
        port: config.port,
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
    });

    if (config.isDev) {
        log.info(`📚 API available at http://localhost:${config.port}`);
        log.info(`❤️  Health check at http://localhost:${config.port}/health`);
    }
});

// =============================================================================
// Graceful Shutdown
// =============================================================================

const shutdown = async (signal: string) => {
    log.info(`${signal} received, shutting down gracefully...`);

    // Close HTTP server
    server.close(async () => {
        log.info('HTTP server closed');

        // Disconnect from database
        await prisma.$disconnect();
        log.info('Database connection closed');

        process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
        log.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// =============================================================================
// Unhandled Errors
// =============================================================================

process.on('unhandledRejection', (reason) => {
    log.error('Unhandled Rejection', reason as Error);
});

process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception', error);
    process.exit(1);
});

export default server;
