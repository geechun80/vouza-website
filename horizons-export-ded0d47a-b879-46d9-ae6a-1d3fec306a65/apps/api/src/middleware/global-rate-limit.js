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

// A TOTP code is only 6 digits (1M combinations) and valid for ~90s, so the
// endpoints that check one (login-by-code, confirming setup) need a strict
// per-IP cap to make brute-forcing a code within its validity window
// infeasible — this alone, not a per-account lockout, is the defense here.
export const totpRateLimit = rateLimit({
	windowMs: 5 * 60 * 1000,
	max: 8,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many attempts, please try again later' },
});