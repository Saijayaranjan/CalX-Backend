// =============================================================================
// CalX Backend - AI Service
// =============================================================================
// Multi-provider AI integration with sanitization and chunking.
// Supports: OpenAI, Anthropic, Gemini, DeepSeek, Perplexity, Groq, OpenRouter
// =============================================================================

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { log } from '../utils/logger.js';
import { generateQueryId } from '../utils/crypto.js';
import { sanitizeAIResponse, chunkResponse, checkContentPolicy } from './sanitization.service.js';
import { ValidationError, NotFoundError, AppError } from '../types/index.js';
import type { AIQueryResponse, AIProviderConfig } from '../types/index.js';
import type { AIProvider } from '@prisma/client';

// =============================================================================
// AI Query Processing
// =============================================================================

export async function processAIQuery(
    deviceDbId: string,
    prompt: string
): Promise<AIQueryResponse> {
    // Get device and AI config
    const device = await prisma.device.findUnique({
        where: { id: deviceDbId },
        include: {
            aiConfig: true,
        },
    });

    if (!device) {
        throw new NotFoundError('Device not found');
    }

    // Get AI configuration
    const aiConfig = device.aiConfig;
    if (!aiConfig) {
        throw new ValidationError('AI not configured for this device');
    }

    // Get API key (from device config or environment)
    const apiKey = getApiKey(aiConfig.provider, aiConfig.apiKey);
    if (!apiKey) {
        throw new ValidationError(`No API key configured for ${aiConfig.provider}`);
    }

    const providerConfig: AIProviderConfig = {
        provider: aiConfig.provider,
        model: aiConfig.model,
        apiKey,
        maxChars: aiConfig.maxChars,
        temperature: aiConfig.temperature,
    };

    log.device.ai(device.deviceId, aiConfig.provider, prompt.length);

    // Call AI provider
    let rawResponse: string;
    try {
        rawResponse = await callAIProvider(prompt, providerConfig);
    } catch (error) {
        log.error('AI provider error', error as Error, {
            provider: aiConfig.provider,
            deviceId: device.deviceId,
        });
        throw new AppError(500, 'AI provider error. Please try again.');
    }

    // Check content policy
    const policyCheck = checkContentPolicy(rawResponse);
    if (!policyCheck.safe) {
        return {
            chunk: 'Content blocked by policy',
            has_more: false,
        };
    }

    // Sanitize response
    const sanitized = sanitizeAIResponse(rawResponse);

    // Chunk response
    const chunks = chunkResponse(sanitized, config.limits.aiOutputChunkSize);

    // Update activity log
    await prisma.activityLog.upsert({
        where: { deviceId: device.id },
        create: {
            deviceId: device.id,
            lastAiQuery: new Date(),
        },
        update: {
            lastAiQuery: new Date(),
        },
    });

    // If response fits in one chunk, return directly
    if (chunks.length === 1) {
        return {
            chunk: chunks[0],
            has_more: false,
        };
    }

    // Store remaining chunks for later retrieval
    const queryId = generateQueryId();
    await prisma.aIChunk.create({
        data: {
            queryId,
            deviceId: device.id,
            chunks: chunks.slice(1), // Store remaining chunks
            cursor: 1,
            expiresAt: new Date(Date.now() + config.limits.aiChunkTTL * 1000),
        },
    });

    return {
        chunk: chunks[0],
        has_more: true,
        cursor: queryId,
    };
}

// =============================================================================
// Continue AI Response (fetch next chunk)
// =============================================================================

export async function continueAIQuery(cursor: string): Promise<AIQueryResponse> {
    const chunkRecord = await prisma.aIChunk.findUnique({
        where: { queryId: cursor },
    });

    if (!chunkRecord) {
        throw new NotFoundError('Query not found or expired');
    }

    // Check if expired
    if (chunkRecord.expiresAt < new Date()) {
        await prisma.aIChunk.delete({ where: { id: chunkRecord.id } });
        throw new NotFoundError('Query expired');
    }

    const chunks = chunkRecord.chunks as string[];
    const currentIndex = chunkRecord.cursor;

    if (currentIndex >= chunks.length) {
        // No more chunks, clean up
        await prisma.aIChunk.delete({ where: { id: chunkRecord.id } });
        return {
            chunk: '',
            has_more: false,
        };
    }

    const currentChunk = chunks[currentIndex];
    const hasMore = currentIndex + 1 < chunks.length;

    // Update cursor or delete if done
    if (hasMore) {
        await prisma.aIChunk.update({
            where: { id: chunkRecord.id },
            data: { cursor: currentIndex + 1 },
        });
    } else {
        await prisma.aIChunk.delete({ where: { id: chunkRecord.id } });
    }

    return {
        chunk: currentChunk,
        has_more: hasMore,
        cursor: hasMore ? cursor : undefined,
    };
}

// =============================================================================
// AI Provider Implementations
// =============================================================================

async function callAIProvider(prompt: string, config: AIProviderConfig): Promise<string> {
    switch (config.provider) {
        case 'OPENAI':
            return callOpenAI(prompt, config);
        case 'ANTHROPIC':
            return callAnthropic(prompt, config);
        case 'GEMINI':
            return callGemini(prompt, config);
        case 'DEEPSEEK':
            return callDeepSeek(prompt, config);
        case 'PERPLEXITY':
            return callPerplexity(prompt, config);
        case 'GROQ':
            return callGroq(prompt, config);
        case 'OPENROUTER':
            return callOpenRouter(prompt, config);
        default:
            throw new ValidationError(`Unsupported AI provider: ${config.provider}`);
    }
}

// OpenAI
async function callOpenAI(prompt: string, providerConfig: AIProviderConfig): Promise<string> {
    const openai = new OpenAI({ apiKey: providerConfig.apiKey });

    const response = await openai.chat.completions.create({
        model: providerConfig.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.floor(providerConfig.maxChars / 4), // Rough token estimate
        temperature: providerConfig.temperature,
    });

    return response.choices[0]?.message?.content || '';
}

// Anthropic (Claude)
async function callAnthropic(prompt: string, providerConfig: AIProviderConfig): Promise<string> {
    const anthropic = new Anthropic({ apiKey: providerConfig.apiKey });

    const response = await anthropic.messages.create({
        model: providerConfig.model,
        max_tokens: Math.floor(providerConfig.maxChars / 4),
        messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    return textContent?.type === 'text' ? textContent.text : '';
}

// Google Gemini
async function callGemini(prompt: string, providerConfig: AIProviderConfig): Promise<string> {
    const genAI = new GoogleGenerativeAI(providerConfig.apiKey);
    const model = genAI.getGenerativeModel({ model: providerConfig.model });

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text();
}

// DeepSeek (OpenAI-compatible API)
async function callDeepSeek(prompt: string, providerConfig: AIProviderConfig): Promise<string> {
    const openai = new OpenAI({
        apiKey: providerConfig.apiKey,
        baseURL: 'https://api.deepseek.com/v1',
    });

    const response = await openai.chat.completions.create({
        model: providerConfig.model || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.floor(providerConfig.maxChars / 4),
        temperature: providerConfig.temperature,
    });

    return response.choices[0]?.message?.content || '';
}

// Perplexity (OpenAI-compatible API)
async function callPerplexity(prompt: string, providerConfig: AIProviderConfig): Promise<string> {
    const openai = new OpenAI({
        apiKey: providerConfig.apiKey,
        baseURL: 'https://api.perplexity.ai',
    });

    const response = await openai.chat.completions.create({
        model: providerConfig.model || 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.floor(providerConfig.maxChars / 4),
        temperature: providerConfig.temperature,
    });

    return response.choices[0]?.message?.content || '';
}

// Groq (OpenAI-compatible API)
async function callGroq(prompt: string, providerConfig: AIProviderConfig): Promise<string> {
    const openai = new OpenAI({
        apiKey: providerConfig.apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
    });

    const response = await openai.chat.completions.create({
        model: providerConfig.model || 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.floor(providerConfig.maxChars / 4),
        temperature: providerConfig.temperature,
    });

    return response.choices[0]?.message?.content || '';
}

// OpenRouter (OpenAI-compatible API)
async function callOpenRouter(prompt: string, providerConfig: AIProviderConfig): Promise<string> {
    const openai = new OpenAI({
        apiKey: providerConfig.apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
    });

    const response = await openai.chat.completions.create({
        model: providerConfig.model || 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.floor(providerConfig.maxChars / 4),
        temperature: providerConfig.temperature,
    });

    return response.choices[0]?.message?.content || '';
}

// =============================================================================
// Get API Key
// =============================================================================

function getApiKey(provider: AIProvider, deviceApiKey?: string | null): string | null {
    // Device-specific API key takes priority
    if (deviceApiKey) {
        return deviceApiKey;
    }

    // Fall back to environment variable
    switch (provider) {
        case 'OPENAI':
            return config.ai.openai || null;
        case 'ANTHROPIC':
            return config.ai.anthropic || null;
        case 'GEMINI':
            return config.ai.gemini || null;
        case 'DEEPSEEK':
            return config.ai.deepseek || null;
        case 'PERPLEXITY':
            return config.ai.perplexity || null;
        case 'GROQ':
            return config.ai.groq || null;
        case 'OPENROUTER':
            return config.ai.openrouter || null;
        default:
            return null;
    }
}

// =============================================================================
// Cleanup Expired Chunks (for cron job)
// =============================================================================

export async function cleanupExpiredChunks(): Promise<number> {
    const result = await prisma.aIChunk.deleteMany({
        where: {
            expiresAt: { lt: new Date() },
        },
    });

    return result.count;
}
