// =============================================================================
// CalX Backend - Environment Configuration
// =============================================================================
// Validates and exports all environment variables with type safety.
// =============================================================================

import { z } from 'zod';

// Environment schema with validation
const envSchema = z.object({
    // Server
    PORT: z.string().default('3000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Database
    DATABASE_URL: z.string().url(),

    // Authentication
    JWT_SECRET: z.string().min(32),
    DEVICE_TOKEN_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('7d'),

    // AI Providers (all optional - user provides their own keys)
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GOOGLE_AI_API_KEY: z.string().optional(),
    DEEPSEEK_API_KEY: z.string().optional(),
    PERPLEXITY_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),

    // Supabase (for firmware storage)
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    // CORS
    CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),

    // Logging
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    SENTRY_DSN: z.string().optional(),
});

// Parse and validate environment
function loadEnv() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(result.error.format());
        process.exit(1);
    }

    return result.data;
}

export const env = loadEnv();

// Derived configuration
export const config = {
    // Server
    port: parseInt(env.PORT, 10),
    nodeEnv: env.NODE_ENV,
    isDev: env.NODE_ENV === 'development',
    isProd: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',

    // Database
    databaseUrl: env.DATABASE_URL,

    // Auth
    jwt: {
        secret: env.JWT_SECRET,
        expiresIn: env.JWT_EXPIRES_IN,
    },
    deviceToken: {
        secret: env.DEVICE_TOKEN_SECRET,
    },

    // AI Providers
    ai: {
        openai: env.OPENAI_API_KEY,
        anthropic: env.ANTHROPIC_API_KEY,
        gemini: env.GOOGLE_AI_API_KEY,
        deepseek: env.DEEPSEEK_API_KEY,
        perplexity: env.PERPLEXITY_API_KEY,
        groq: env.GROQ_API_KEY,
        openrouter: env.OPENROUTER_API_KEY,
    },

    // Supabase
    supabase: {
        url: env.SUPABASE_URL,
        anonKey: env.SUPABASE_ANON_KEY,
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    },

    // CORS - handle '*' as wildcard
    corsOrigins: env.CORS_ORIGINS === '*'
        ? true  // Allow all origins
        : env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),

    // Logging
    logLevel: env.LOG_LEVEL,
    sentryDsn: env.SENTRY_DSN,

    // Constraints (from spec)
    limits: {
        chatMaxChars: 2500,
        chatHardLimit: 4000,
        aiInputMaxChars: 2500,
        aiInputHardLimit: 4000,
        aiOutputChunkSize: 2500,
        fileMaxChars: 4000,
        bindCodeTTL: 300, // seconds
        aiChunkTTL: 3600, // 1 hour in seconds
        chatPageSize: 20,
    },

    // Heartbeat timing
    heartbeat: {
        normalIntervalMs: 60000, // 60 seconds
        lowPowerIntervalMs: 600000, // 10 minutes
        onlineThresholdMultiplier: 2, // device considered online if lastSeen within 2x interval
    },
} as const;

export type Config = typeof config;
