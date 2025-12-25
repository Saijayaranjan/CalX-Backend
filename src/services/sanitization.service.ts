// =============================================================================
// CalX Backend - Sanitization Service
// =============================================================================
// AI response sanitization pipeline: strip markdown, convert math symbols,
// and chunk at safe boundaries.
// =============================================================================

import { config } from '../config/env.js';

// =============================================================================
// Main Sanitization Pipeline
// =============================================================================

export function sanitizeAIResponse(content: string): string {
    let result = content;

    // Step 1: Strip markdown code blocks
    result = stripCodeBlocks(result);

    // Step 2: Strip inline markdown formatting
    result = stripMarkdown(result);

    // Step 3: Convert math symbols to readable text
    result = convertMathSymbols(result);

    // Step 4: Convert tables to plain text
    result = convertTables(result);

    // Step 5: Normalize whitespace
    result = normalizeWhitespace(result);

    return result;
}

// =============================================================================
// Chunk AI Response Safely
// =============================================================================

export function chunkResponse(
    content: string,
    maxChunkSize: number = config.limits.aiOutputChunkSize
): string[] {
    if (content.length <= maxChunkSize) {
        return [content];
    }

    const chunks: string[] = [];
    let remaining = content;

    while (remaining.length > 0) {
        if (remaining.length <= maxChunkSize) {
            chunks.push(remaining);
            break;
        }

        // Find safe boundary within max chunk size
        const chunk = remaining.substring(0, maxChunkSize);
        const boundary = findSafeBoundary(chunk);

        chunks.push(chunk.substring(0, boundary).trim());
        remaining = remaining.substring(boundary).trim();
    }

    return chunks;
}

// =============================================================================
// Find Safe Chunk Boundary
// =============================================================================

function findSafeBoundary(text: string): number {
    const maxLen = text.length;

    // Priority 1: End of sentence (.!?\n)
    const sentenceEnd = findLastSentenceEnd(text);
    if (sentenceEnd > maxLen * 0.5) {
        return sentenceEnd;
    }

    // Priority 2: End of clause (,;:)
    const clauseEnd = findLastClauseEnd(text);
    if (clauseEnd > maxLen * 0.5) {
        return clauseEnd;
    }

    // Priority 3: End of word (space)
    const wordEnd = text.lastIndexOf(' ');
    if (wordEnd > maxLen * 0.5) {
        return wordEnd;
    }

    // Fallback: just use max length (may split mid-word)
    return maxLen;
}

function findLastSentenceEnd(text: string): number {
    // Find last sentence-ending punctuation followed by space or end
    const patterns = [/\.\s/g, /!\s/g, /\?\s/g, /\n/g];
    let lastPos = -1;

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            // Check we're not inside parentheses or brackets
            if (!isInsideBrackets(text, match.index)) {
                lastPos = Math.max(lastPos, match.index + 1);
            }
        }
    }

    return lastPos;
}

function findLastClauseEnd(text: string): number {
    const pattern = /[,;:]\s/g;
    let lastPos = -1;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (!isInsideBrackets(text, match.index)) {
            lastPos = match.index + 1;
        }
    }

    return lastPos;
}

function isInsideBrackets(text: string, position: number): boolean {
    const before = text.substring(0, position);

    // Count open and close brackets
    const openParens = (before.match(/\(/g) || []).length;
    const closeParens = (before.match(/\)/g) || []).length;
    const openBrackets = (before.match(/\[/g) || []).length;
    const closeBrackets = (before.match(/\]/g) || []).length;
    const openBraces = (before.match(/\{/g) || []).length;
    const closeBraces = (before.match(/\}/g) || []).length;

    return (
        openParens > closeParens ||
        openBrackets > closeBrackets ||
        openBraces > closeBraces
    );
}

// =============================================================================
// Strip Code Blocks
// =============================================================================

function stripCodeBlocks(content: string): string {
    // Remove fenced code blocks (```...```)
    let result = content.replace(/```[\s\S]*?```/g, (match) => {
        // Extract the code content without the fences
        const lines = match.split('\n');
        // Remove first line (```language) and last line (```)
        const codeLines = lines.slice(1, -1);
        return codeLines.join('\n');
    });

    // Remove inline code (`...`)
    result = result.replace(/`([^`]+)`/g, '$1');

    return result;
}

// =============================================================================
// Strip Markdown Formatting
// =============================================================================

function stripMarkdown(content: string): string {
    let result = content;

    // Remove headers (# ## ### etc.)
    result = result.replace(/^#{1,6}\s+/gm, '');

    // Remove bold (**text** or __text__)
    result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
    result = result.replace(/__([^_]+)__/g, '$1');

    // Remove italic (*text* or _text_)
    result = result.replace(/\*([^*]+)\*/g, '$1');
    result = result.replace(/_([^_]+)_/g, '$1');

    // Remove strikethrough (~~text~~)
    result = result.replace(/~~([^~]+)~~/g, '$1');

    // Remove links [text](url) -> text
    result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove images ![alt](url)
    result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

    // Remove blockquotes (> )
    result = result.replace(/^>\s*/gm, '');

    // Remove horizontal rules (---, ***, ___)
    result = result.replace(/^[-*_]{3,}$/gm, '');

    // Remove list markers (* - + or 1.)
    result = result.replace(/^[\s]*[-*+]\s+/gm, '• ');
    result = result.replace(/^[\s]*\d+\.\s+/gm, '');

    return result;
}

// =============================================================================
// Convert Math Symbols
// =============================================================================

function convertMathSymbols(content: string): string {
    const replacements: [RegExp, string][] = [
        // Square root
        [/√\(([^)]+)\)/g, 'sqrt($1)'],
        [/√(\d+)/g, 'sqrt($1)'],
        [/√/g, 'sqrt'],

        // Integral
        [/∫/g, 'Integral of '],

        // Summation
        [/∑/g, 'Sum of '],
        [/Σ/g, 'Sum of '],

        // Product
        [/∏/g, 'Product of '],
        [/Π/g, 'Product of '],

        // Infinity
        [/∞/g, 'infinity'],

        // Plus/minus
        [/±/g, '+/-'],

        // Multiplication
        [/×/g, '*'],
        [/⋅/g, '*'],

        // Division
        [/÷/g, '/'],

        // Not equal
        [/≠/g, '!='],

        // Less/greater than or equal
        [/≤/g, '<='],
        [/≥/g, '>='],

        // Approximately
        [/≈/g, '~='],

        // Proportional
        [/∝/g, ' proportional to '],

        // Degree
        [/°/g, ' degrees'],

        // Pi
        [/π/g, 'pi'],

        // Theta
        [/θ/g, 'theta'],

        // Alpha, Beta, Gamma, Delta
        [/α/g, 'alpha'],
        [/β/g, 'beta'],
        [/γ/g, 'gamma'],
        [/δ/g, 'delta'],
        [/Δ/g, 'Delta'],

        // Lambda
        [/λ/g, 'lambda'],

        // Mu, Sigma
        [/μ/g, 'mu'],
        [/σ/g, 'sigma'],

        // Omega
        [/ω/g, 'omega'],
        [/Ω/g, 'Omega'],

        // Arrows
        [/→/g, '->'],
        [/←/g, '<-'],
        [/↔/g, '<->'],
        [/⇒/g, '=>'],
        [/⇐/g, '<='],

        // Subscripts (simple cases)
        [/₀/g, '_0'],
        [/₁/g, '_1'],
        [/₂/g, '_2'],
        [/₃/g, '_3'],
        [/₄/g, '_4'],
        [/₅/g, '_5'],
        [/₆/g, '_6'],
        [/₇/g, '_7'],
        [/₈/g, '_8'],
        [/₉/g, '_9'],
        [/ₙ/g, '_n'],
        [/ₓ/g, '_x'],
        [/ᵢ/g, '_i'],
        [/ⱼ/g, '_j'],

        // Superscripts (simple cases)
        [/⁰/g, '^0'],
        [/¹/g, '^1'],
        [/²/g, '^2'],
        [/³/g, '^3'],
        [/⁴/g, '^4'],
        [/⁵/g, '^5'],
        [/⁶/g, '^6'],
        [/⁷/g, '^7'],
        [/⁸/g, '^8'],
        [/⁹/g, '^9'],
        [/ⁿ/g, '^n'],

        // Fractions
        [/½/g, '1/2'],
        [/⅓/g, '1/3'],
        [/¼/g, '1/4'],
        [/⅕/g, '1/5'],
        [/⅙/g, '1/6'],
        [/⅐/g, '1/7'],
        [/⅛/g, '1/8'],
        [/⅑/g, '1/9'],
        [/⅒/g, '1/10'],
        [/⅔/g, '2/3'],
        [/¾/g, '3/4'],
        [/⅖/g, '2/5'],
        [/⅗/g, '3/5'],
        [/⅘/g, '4/5'],
    ];

    let result = content;
    for (const [pattern, replacement] of replacements) {
        result = result.replace(pattern, replacement);
    }

    return result;
}

// =============================================================================
// Convert Tables to Plain Text
// =============================================================================

function convertTables(content: string): string {
    // Detect markdown tables and convert to plain text rows
    const tablePattern = /\|(.+)\|/g;
    const separatorPattern = /^\|[-:| ]+\|$/;

    const lines = content.split('\n');
    const result: string[] = [];

    for (const line of lines) {
        // Skip separator lines
        if (separatorPattern.test(line.trim())) {
            continue;
        }

        // Convert table rows
        if (tablePattern.test(line)) {
            const cells = line
                .split('|')
                .filter((cell) => cell.trim())
                .map((cell) => cell.trim())
                .join(' | ');
            result.push(cells);
        } else {
            result.push(line);
        }
    }

    return result.join('\n');
}

// =============================================================================
// Normalize Whitespace
// =============================================================================

function normalizeWhitespace(content: string): string {
    let result = content;

    // Replace multiple spaces with single space
    result = result.replace(/  +/g, ' ');

    // Replace multiple newlines with double newline
    result = result.replace(/\n{3,}/g, '\n\n');

    // Trim each line
    result = result
        .split('\n')
        .map((line) => line.trim())
        .join('\n');

    // Trim overall
    result = result.trim();

    return result;
}

// =============================================================================
// Content Policy Check (placeholder)
// =============================================================================

export function checkContentPolicy(_content: string): { safe: boolean; reason?: string } {
    // This is a placeholder for content moderation
    // In production, you might integrate with OpenAI's moderation API
    // or another content filtering service

    // For now, just return safe
    return { safe: true };
}
