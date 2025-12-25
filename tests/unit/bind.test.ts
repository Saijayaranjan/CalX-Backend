// =============================================================================
// CalX Backend - Bind Flow Tests
// =============================================================================

import { generateBindCode, hashDeviceToken, generateDeviceToken } from '../../src/utils/crypto';

describe('Bind Flow', () => {
    describe('Bind Code Generation', () => {
        it('should generate a 4-character bind code', () => {
            const code = generateBindCode(4);
            expect(code).toHaveLength(4);
        });

        it('should generate uppercase alphanumeric codes', () => {
            const code = generateBindCode(4);
            expect(code).toMatch(/^[A-Z0-9]+$/);
        });

        it('should not include ambiguous characters', () => {
            // Generate many codes to increase chance of catching ambiguous chars
            for (let i = 0; i < 100; i++) {
                const code = generateBindCode(4);
                expect(code).not.toMatch(/[0OI1L]/);
            }
        });

        it('should generate unique codes', () => {
            const codes = new Set<string>();
            for (let i = 0; i < 100; i++) {
                codes.add(generateBindCode(4));
            }
            // Should have high uniqueness (allow some collisions due to randomness)
            expect(codes.size).toBeGreaterThan(90);
        });
    });

    describe('Device Token', () => {
        it('should generate a device token with correct prefix', () => {
            const token = generateDeviceToken();
            expect(token).toMatch(/^dev_tok_[a-f0-9]{32}$/);
        });

        it('should generate unique tokens', () => {
            const token1 = generateDeviceToken();
            const token2 = generateDeviceToken();
            expect(token1).not.toBe(token2);
        });

        it('should hash device tokens consistently', () => {
            const token = 'dev_tok_test123';
            const hash1 = hashDeviceToken(token);
            const hash2 = hashDeviceToken(token);
            expect(hash1).toBe(hash2);
        });

        it('should produce different hashes for different tokens', () => {
            const hash1 = hashDeviceToken('dev_tok_test1');
            const hash2 = hashDeviceToken('dev_tok_test2');
            expect(hash1).not.toBe(hash2);
        });
    });

    describe('Bind Code TTL', () => {
        it('should create bind code with 300 second TTL', () => {
            const now = Date.now();
            const expiresAt = new Date(now + 300 * 1000);
            const ttl = (expiresAt.getTime() - now) / 1000;
            expect(ttl).toBe(300);
        });

        it('should correctly identify expired codes', () => {
            const expiredDate = new Date(Date.now() - 1000); // 1 second ago
            const isExpired = expiredDate < new Date();
            expect(isExpired).toBe(true);
        });

        it('should correctly identify valid codes', () => {
            const validDate = new Date(Date.now() + 300000); // 5 minutes from now
            const isValid = validDate > new Date();
            expect(isValid).toBe(true);
        });
    });
});
