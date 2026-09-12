import { Router } from 'express';
import healthCheck from './health-check.js';
import stripeRouter from './stripe.js';
import auth2faRouter from './auth-2fa.js';
import whatsappRouter from './whatsapp.js';

const router = Router();

export default () => {
    router.get('/health', healthCheck);
    router.use('/stripe', stripeRouter);
    router.use('/auth', auth2faRouter);
    router.use('/whatsapp', whatsappRouter);

    return router;
};