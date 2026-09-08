import rateLimit from 'express-rate-limit';

export const globalRateLimit = rateLimit({
	windowMs: 5 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many requests, please try again later' },
});

// Tighter limit for the money-moving endpoints (create/cancel subscription) so
// a compromised session or bug can't hammer Stripe; applied in stripe.js after
// authenticate, and not on /webhook or /invoices.
export const billingRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many billing requests, please try again later' },
});