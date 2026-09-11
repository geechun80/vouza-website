import { Router } from 'express';
import { OTP } from 'otplib';
import QRCode from 'qrcode';
import pb from '../utils/pocketbaseClient.js';
import authenticate from '../middleware/auth.js';
import { totpRateLimit } from '../middleware/global-rate-limit.js';

const router = Router();

const ISSUER = 'Vouza AI';
const otp = new OTP({ strategy: 'totp' });

// Accepts a code from one period either side of the server's current time,
// so a little clock drift between the server and the user's phone doesn't
// reject an otherwise-correct code.
const verifyCode = (secret, token) => otp.verify({ secret, token: String(token), epochTolerance: 1 });

// POST /auth/2fa/setup
// Generates a new TOTP secret + QR code for the authenticated user. Not
// persisted yet — the secret only reaches PocketBase once /confirm proves the
// user actually scanned it correctly, so an abandoned setup leaves no trace.
router.post('/2fa/setup', authenticate, async (req, res) => {
	const user = await pb.collection('users').getOne(req.userId);

	if (user.totp_enabled) {
		return res.status(400).json({ error: 'Two-factor authentication is already enabled' });
	}

	const secret = otp.generateSecret();
	const otpauth = otp.generateURI({ issuer: ISSUER, label: user.email, secret });
	const qrCode = await QRCode.toDataURL(otpauth);

	res.json({ secret, qrCode });
});

// POST /auth/2fa/confirm
// Body: { secret, code }. Verifies the just-scanned code against the secret
// from /setup before persisting it — proves the user's authenticator app is
// actually working before 2FA can be relied on to sign them in later.
router.post('/2fa/confirm', authenticate, totpRateLimit, async (req, res) => {
	const { secret, code } = req.body;

	if (!secret || !code) {
		return res.status(400).json({ error: 'Missing required fields: secret, code' });
	}

	let result;
	try {
		result = await verifyCode(secret, code);
	} catch (error) {
		return res.status(400).json({ error: 'Invalid code' });
	}

	if (!result.valid) {
		return res.status(400).json({ error: 'Incorrect code — check your authenticator app and try again' });
	}

	await pb.collection('users').update(req.userId, {
		totp_secret: secret,
		totp_enabled: true,
	});

	res.json({ success: true });
});

// POST /auth/2fa/disable
router.post('/2fa/disable', authenticate, async (req, res) => {
	await pb.collection('users').update(req.userId, {
		totp_secret: '',
		totp_enabled: false,
	});

	res.json({ success: true });
});

// POST /auth/totp-login
// Body: { email, code }. An alternative to password/Google sign-in, not a
// second factor stacked on top of them — the user's password and Google
// login keep working unchanged whether or not this is set up (policy
// decision: no separate recovery-codes system, since those already serve as
// the fallback). On success, mints a real PocketBase auth token via
// impersonate() — the same shape authWithPassword returns — so the frontend
// stores it exactly the same way.
router.post('/totp-login', totpRateLimit, async (req, res) => {
	const { email, code } = req.body;

	if (!email || !code) {
		return res.status(400).json({ error: 'Missing required fields: email, code' });
	}

	// Looked up as the superuser (collection rules don't apply), so this
	// endpoint's own logic is the only thing deciding who gets in — the
	// generic message on every failure path below avoids confirming whether
	// an email exists or has 2FA enabled.
	const genericError = () => res.status(400).json({ error: 'Invalid email or code' });

	let user;
	try {
		user = await pb.collection('users').getFirstListItem(pb.filter('email = {:email}', { email }));
	} catch (error) {
		return genericError();
	}

	if (!user.totp_enabled || !user.totp_secret) {
		return genericError();
	}

	let result;
	try {
		result = await verifyCode(user.totp_secret, code);
	} catch (error) {
		return genericError();
	}

	if (!result.valid) {
		return genericError();
	}

	const impersonated = await pb.collection('users').impersonate(user.id, 0);

	res.json({
		token: impersonated.authStore.token,
		record: impersonated.authStore.record,
	});
});

export default router;
