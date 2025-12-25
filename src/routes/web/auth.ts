// =============================================================================
// CalX Backend - Web Auth Routes
// =============================================================================
// User registration and login endpoints.
// =============================================================================

import { Router } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { rateLimiter } from '../../middleware/validatePayload.js';
import { registerSchema, loginSchema } from '../../utils/validators.js';
import { registerUser, loginUser } from '../../services/auth.service.js';
import { ValidationError } from '../../types/index.js';

const router = Router();

// =============================================================================
// POST /web/auth/register
// =============================================================================

router.post(
    '/register',
    rateLimiter('auth'), // Placeholder for rate limiting
    asyncHandler(async (req, res) => {
        // Validate input
        const result = registerSchema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { email, password } = result.data;

        // Register user
        const { userId } = await registerUser(email, password);

        res.status(201).json({
            success: true,
            data: { user_id: userId },
        });
    })
);

// =============================================================================
// POST /web/auth/login
// =============================================================================

router.post(
    '/login',
    rateLimiter('auth'), // Placeholder for rate limiting
    asyncHandler(async (req, res) => {
        // Validate input
        const result = loginSchema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError(result.error.errors[0].message);
        }

        const { email, password } = result.data;

        // Login user
        const loginResponse = await loginUser(email, password);

        res.json({
            success: true,
            data: loginResponse,
        });
    })
);

export default router;
