import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import routes from './routes/index.js';
import { errorMiddleware } from './middleware/error.js';
import { globalRateLimit } from './middleware/global-rate-limit.js';
import logger from './utils/logger.js';
import { BodyLimit } from './constants/common.js';

const app = express();

// Exactly one hop (the platform's reverse proxy) is trusted for X-Forwarded-For,
// so req.ip reflects the real client and can't be spoofed by an extra hop the
// client adds itself — `true` trusted the whole chain including client-supplied headers.
app.set('trust proxy', 1);

process.on('uncaughtException', (error) => {
	logger.error('Uncaught exception:', error);
});
  
process.on('unhandledRejection', (reason, promise) => {
	logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

process.on('SIGINT', async () => {
	logger.info('Interrupted');
	process.exit(0);
});

process.on('SIGTERM', async () => {
	logger.info('SIGTERM signal received');

	await new Promise(resolve => setTimeout(resolve, 3000));

	logger.info('Exiting');
	process.exit();
});

app.use(helmet());
app.use(cors({
	origin: process.env.CORS_ORIGIN,
	credentials: true,
}));
app.use(morgan('combined'));
app.use(globalRateLimit);

// The Stripe webhook route needs the raw, unparsed request body to verify
// stripe.webhooks.constructEvent's signature — express.json() would consume
// the stream and hand it an already-parsed object, so constructEvent would
// throw on every call. Routes are mounted at '/' (see routes/index.js:
// router.use('/stripe', stripeRouter)), so the path Express sees here is
// '/stripe/webhook' regardless of the external URL (api.vouza.ai/stripe/webhook
// in production). Skip the global parsers for that one path and let the
// route's own express.raw() (in stripe.js) handle it.
const jsonParser = express.json({
	limit: BodyLimit,
});
const urlencodedParser = express.urlencoded({
	extended: true,
	limit: BodyLimit,
});
app.use((req, res, next) => (req.path === '/stripe/webhook' ? next() : jsonParser(req, res, next)));
app.use((req, res, next) => (req.path === '/stripe/webhook' ? next() : urlencodedParser(req, res, next)));

app.use('/', routes());

app.use(errorMiddleware);

app.use((req, res) => {
	res.status(404).json({ error: 'Route not found' });
});

const port = process.env.PORT || 3001;

// Bound to loopback only: Traefik is the sole public entrypoint (see the
// per-subdomain files in /etc/traefik/dynamic on the deploy host), so this
// process has no business being reachable on the VPS's public interface.
app.listen(port, '127.0.0.1', () => {
	logger.info(`🚀 API Server running on http://localhost:${port}`);
});

export default app;