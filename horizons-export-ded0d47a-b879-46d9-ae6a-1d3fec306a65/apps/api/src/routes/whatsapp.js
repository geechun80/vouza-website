import { Router } from 'express';
import pb from '../utils/pocketbaseClient.js';
import authenticate from '../middleware/auth.js';
import { totpRateLimit } from '../middleware/global-rate-limit.js';

const router = Router();

// Vouza's own Meta app, already an approved Tech Provider — see project
// memory for how this was set up. Bare Zero Integration Onboarding link:
// Meta hosts the whole flow, no page of ours needs to embed anything.
const ZERO_INTEGRATION_URL =
    'https://business.facebook.com/messaging/whatsapp/onboard/?app_id=1358134533194597&config_id=4509495119264313';

// E.164: +, 1-9 as the first digit, up to 15 digits total.
const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

const getOwnedSubscription = async (subscriptionId, userId) => {
    const record = await pb.collection('subscriptions').getOne(subscriptionId);
    if (record.user_id !== userId) {
        // Same not-found-vs-not-yours masking used by the other subscription
        // endpoints — a mismatch is reported identically either way.
        throw new Error('not found');
    }
    return record;
};

// GET /whatsapp/status/:subscriptionId
// Tells the setup page which state to render: number not yet captured,
// captured and ready to go to Meta, or already connected.
router.get('/status/:subscriptionId', authenticate, async (req, res) => {
    let record;
    try {
        record = await getOwnedSubscription(req.params.subscriptionId, req.userId);
    } catch (error) {
        return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({
        plan: record.plan,
        whatsappConnected: !!record.whatsapp_connected,
        whatsappNumber: record.whatsapp_number_e164 || null,
        onboardingUrl: ZERO_INTEGRATION_URL,
        businessInfo: {
            name: record.business_name || '',
            description: record.business_description || '',
            keyFacts: record.business_key_facts || '',
            tone: record.business_tone || '',
        },
    });
});

const BUSINESS_TONES = ['friendly', 'professional', 'casual'];

// POST /whatsapp/set-business-info
// Body: { subscriptionId, name, description, keyFacts, tone }. What the AI
// Agent actually knows about the customer's business — collected here
// instead of guessed, since a generic agent can't answer real questions
// about a business it knows nothing about. Independent of /set-number: a
// customer can fill this in before, after, or while connecting Meta.
router.post('/set-business-info', authenticate, async (req, res) => {
    const { subscriptionId, name, description, keyFacts, tone } = req.body;

    if (!subscriptionId || !name) {
        return res.status(400).json({ error: 'Missing required fields: subscriptionId, name' });
    }

    if (tone && !BUSINESS_TONES.includes(tone)) {
        return res.status(400).json({ error: 'Invalid tone' });
    }

    let record;
    try {
        record = await getOwnedSubscription(subscriptionId, req.userId);
    } catch (error) {
        return res.status(404).json({ error: 'Subscription not found' });
    }

    await pb.collection('subscriptions').update(record.id, {
        business_name: name,
        business_description: description || '',
        business_key_facts: keyFacts || '',
        ...(tone ? { business_tone: tone } : {}),
    });

    res.json({ success: true });
});

// POST /whatsapp/set-number
// Body: { subscriptionId, phone }. Captures the customer's WhatsApp number
// in E.164 *before* they're sent to Meta, since Meta's own APIs give us no
// other way to tell which of our customers a newly-shared WABA belongs to
// (Phase 2 backend automation matches on this number once Meta's flow is
// complete — see project memory for the full plan).
router.post('/set-number', authenticate, totpRateLimit, async (req, res) => {
    const { subscriptionId, phone } = req.body;

    if (!subscriptionId || !phone) {
        return res.status(400).json({ error: 'Missing required fields: subscriptionId, phone' });
    }

    if (!E164_PATTERN.test(phone)) {
        return res.status(400).json({ error: 'Enter the number in international format, e.g. +6591234567' });
    }

    let record;
    try {
        record = await getOwnedSubscription(subscriptionId, req.userId);
    } catch (error) {
        return res.status(404).json({ error: 'Subscription not found' });
    }

    await pb.collection('subscriptions').update(record.id, {
        whatsapp_number_e164: phone,
    });

    res.json({ success: true, onboardingUrl: ZERO_INTEGRATION_URL });
});

export default router;
