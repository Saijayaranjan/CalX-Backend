// =============================================================================
// CalX Backend - Express Application
// =============================================================================
// Main Express app configuration with all routes and middleware.
// =============================================================================

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/validatePayload.js';

// Device routes
import deviceBindRoutes from './routes/device/bind.js';
import deviceHeartbeatRoutes from './routes/device/heartbeat.js';
import deviceSettingsRoutes from './routes/device/settings.js';
import deviceChatRoutes from './routes/device/chat.js';
import deviceFileRoutes from './routes/device/file.js';
import deviceAIRoutes from './routes/device/ai.js';
import deviceUpdateRoutes from './routes/device/update.js';

// Web routes
import webAuthRoutes from './routes/web/auth.js';
import webBindRoutes from './routes/web/bind.js';
import webChatRoutes from './routes/web/chat.js';
import webFileRoutes from './routes/web/file.js';
import webDeviceRoutes from './routes/web/device.js';
import webUpdateRoutes from './routes/web/update.js';

// =============================================================================
// Create Express App
// =============================================================================

const app = express();

// =============================================================================
// Security Middleware
// =============================================================================

// Helmet for security headers
app.use(
    helmet({
        contentSecurityPolicy: config.isProd,
        hsts: config.isProd,
    })
);

// CORS
app.use(
    cors({
        origin: config.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// =============================================================================
// Body Parsing
// =============================================================================

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// =============================================================================
// Request Logging
// =============================================================================

app.use(requestLogger);

// =============================================================================
// Health Check Endpoint
// =============================================================================

app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
    });
});

// =============================================================================
// API Documentation Redirect
// =============================================================================

app.get('/docs', (_req: Request, res: Response) => {
    res.redirect('/api-docs');
});

// =============================================================================
// Device Routes (prefix: /device)
// =============================================================================

app.use('/device/bind', deviceBindRoutes);
app.use('/device/heartbeat', deviceHeartbeatRoutes);
app.use('/device/settings', deviceSettingsRoutes);
app.use('/device/chat', deviceChatRoutes);
app.use('/device/file', deviceFileRoutes);
app.use('/device/ai', deviceAIRoutes);
app.use('/device/update', deviceUpdateRoutes);

// =============================================================================
// Web Routes (prefix: /web)
// =============================================================================

app.use('/web/auth', webAuthRoutes);
app.use('/web/bind', webBindRoutes);
app.use('/web/chat', webChatRoutes);
app.use('/web/file', webFileRoutes);
app.use('/web/device', webDeviceRoutes);
app.use('/web/device/update', webUpdateRoutes);

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
