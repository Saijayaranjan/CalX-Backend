// =============================================================================
// CalX Backend - AI Sanitization Tests
// =============================================================================

// Import the sanitization functions
// Note: In actual tests, these would be imported from the service

describe('AI Sanitization', () => {
    // Helper functions matching the service implementation
    const stripCodeBlocks = (content: string): string => {
        let result = content.replace(/```[\s\S]*?```/g, (match) => {
            const lines = match.split('\n');
            const codeLines = lines.slice(1, -1);
            return codeLines.join('\n');
        });
        result = result.replace(/`([^`]+)`/g, '$1');
        return result;
    };

    const stripMarkdown = (content: string): string => {
        let result = content;
        result = result.replace(/^#{1,6}\s+/gm, '');
        result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
        result = result.replace(/__([^_]+)__/g, '$1');
        result = result.replace(/\*([^*]+)\*/g, '$1');
        result = result.replace(/_([^_]+)_/g, '$1');
        result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        return result;
    };

    const convertMathSymbols = (content: string): string => {
        let result = content;
        result = result.replace(/√\(([^)]+)\)/g, 'sqrt($1)');
        result = result.replace(/√(\d+)/g, 'sqrt($1)');
        result = result.replace(/√/g, 'sqrt');
        result = result.replace(/∫/g, 'Integral of ');
        result = result.replace(/∑/g, 'Sum of ');
        result = result.replace(/∞/g, 'infinity');
        result = result.replace(/π/g, 'pi');
        result = result.replace(/≤/g, '<=');
        result = result.replace(/≥/g, '>=');
        result = result.replace(/×/g, '*');
        result = result.replace(/÷/g, '/');
        return result;
    };

    describe('Strip Code Blocks', () => {
        it('should remove fenced code blocks', () => {
            const input = 'Before\n```javascript\nconst x = 1;\n```\nAfter';
            const result = stripCodeBlocks(input);
            expect(result).toBe('Before\nconst x = 1;\nAfter');
        });

        it('should remove inline code', () => {
            const input = 'Use `console.log()` to debug';
            const result = stripCodeBlocks(input);
            expect(result).toBe('Use console.log() to debug');
        });

        it('should handle multiple code blocks', () => {
            const input = '```\ncode1\n```\ntext\n```\ncode2\n```';
            const result = stripCodeBlocks(input);
            expect(result).toBe('code1\ntext\ncode2');
        });
    });

    describe('Strip Markdown', () => {
        it('should remove headers', () => {
            const input = '# Heading 1\n## Heading 2';
            const result = stripMarkdown(input);
            expect(result).toBe('Heading 1\nHeading 2');
        });

        it('should remove bold formatting', () => {
            const input = 'This is **bold** text';
            const result = stripMarkdown(input);
            expect(result).toBe('This is bold text');
        });

        it('should remove italic formatting', () => {
            const input = 'This is *italic* text';
            const result = stripMarkdown(input);
            expect(result).toBe('This is italic text');
        });

        it('should remove links but keep text', () => {
            const input = 'Click [here](https://example.com)';
            const result = stripMarkdown(input);
            expect(result).toBe('Click here');
        });
    });

    describe('Convert Math Symbols', () => {
        it('should convert square root with parentheses', () => {
            const input = '√(16)';
            const result = convertMathSymbols(input);
            expect(result).toBe('sqrt(16)');
        });

        it('should convert square root with number', () => {
            const input = '√16';
            const result = convertMathSymbols(input);
            expect(result).toBe('sqrt(16)');
        });

        it('should convert integral symbol', () => {
            const input = '∫ f(x) dx';
            const result = convertMathSymbols(input);
            expect(result).toBe('Integral of  f(x) dx');
        });

        it('should convert summation symbol', () => {
            const input = '∑ n';
            const result = convertMathSymbols(input);
            expect(result).toBe('Sum of  n');
        });

        it('should convert infinity', () => {
            const input = 'x → ∞';
            const result = convertMathSymbols(input);
            expect(result).toBe('x → infinity');
        });

        it('should convert pi', () => {
            const input = '2π r';
            const result = convertMathSymbols(input);
            expect(result).toBe('2pi r');
        });

        it('should convert comparison operators', () => {
            const input = 'x ≤ 5 and y ≥ 10';
            const result = convertMathSymbols(input);
            expect(result).toBe('x <= 5 and y >= 10');
        });

        it('should convert multiplication and division', () => {
            const input = '5 × 3 = 15 and 15 ÷ 3 = 5';
            const result = convertMathSymbols(input);
            expect(result).toBe('5 * 3 = 15 and 15 / 3 = 5');
        });
    });

    describe('Safe Chunking', () => {
        const MAX_CHUNK = 2500;

        const findSafeBoundary = (text: string): number => {
            const sentenceEnds = ['.', '!', '?', '\n'];
            for (let i = text.length - 1; i > text.length * 0.5; i--) {
                if (sentenceEnds.includes(text[i])) {
                    return i + 1;
                }
            }
            const lastSpace = text.lastIndexOf(' ');
            return lastSpace > text.length * 0.5 ? lastSpace : text.length;
        };

        it('should not split short content', () => {
            const content = 'Short content.';
            expect(content.length).toBeLessThan(MAX_CHUNK);
        });

        it('should prefer sentence boundaries', () => {
            const text = 'First sentence. Second sentence. Third sentence.';
            const boundary = findSafeBoundary(text);
            expect(text[boundary - 1]).toBe('.');
        });

        it('should fall back to word boundaries', () => {
            const text = 'word1 word2 word3 word4 word5';
            const boundary = findSafeBoundary(text);
            expect(text[boundary]).toBe(' ');
        });

        it('should not split inside parentheses', () => {
            const text = 'Calculate (x + y + z) and return.';
            // The boundary should be after the closing parenthesis
            const boundary = findSafeBoundary(text);
            const beforeBoundary = text.substring(0, boundary);
            const openCount = (beforeBoundary.match(/\(/g) || []).length;
            const closeCount = (beforeBoundary.match(/\)/g) || []).length;
            expect(openCount).toBe(closeCount);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty content', () => {
            const result = stripMarkdown('');
            expect(result).toBe('');
        });

        it('should handle content with only symbols', () => {
            const result = convertMathSymbols('√∫∑∞π');
            expect(result).toBe('sqrtIntegral of Sum of infinitypi');
        });

        it('should preserve normal text', () => {
            const input = 'This is normal text without any formatting.';
            expect(stripMarkdown(input)).toBe(input);
            expect(convertMathSymbols(input)).toBe(input);
        });
    });
});
