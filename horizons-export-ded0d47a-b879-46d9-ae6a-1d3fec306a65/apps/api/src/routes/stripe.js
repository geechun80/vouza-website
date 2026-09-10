import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import authenticate from '../middleware/auth.js';
import { PLANS, SETUP_FEE_PRICE_ID, TOPUPS, MARKET_CURRENCIES } from '../constants/plans.js';
import { billingRateLimit } from '../middleware/global-rate-limit.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const STRIPE_SUBSCRIPTION_ID_PATTERN = /^sub_[A-Za-z0-9]+$/;
const STRIPE_INVOICE_ID_PATTERN = /^in_[A-Za-z0-9]+$/;
const isValidStripeSubscriptionId = (id) => typeof id === 'string' && STRIPE_SUBSCRIPTION_ID_PATTERN.test(id);
const isValidStripeInvoiceId = (id) => typeof id === 'string' && STRIPE_INVOICE_ID_PATTERN.test(id);

const APP_URL = process.env.APP_URL || 'https://vouza.ai';

// Stripe moved current_period_end from the Subscription onto its items in the
// 2025-03-31 API version. Read whichever one this account's pinned version
// returns so next_billing_date doesn't silently become an Invalid Date.
const getPeriodEnd = (subscription) => {
  if (!subscription) {
    return null;
  }

  const seconds = subscription.current_period_end
    ?? subscription.items?.data?.[0]?.current_period_end;

  return seconds ? new Date(seconds * 1000) : null;
};

// Reused by /checkout and /topup: the Stripe customer is per-account, not
// per-subscription, so an account's second Agent bills to the same customer.
const getOrCreateStripeCustomer = async (userId) => {
  const userRecord = await pb.collection('users').getOne(userId);

  if (userRecord.stripe_customer_id) {
    return userRecord.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: userRecord.email,
    metadata: { userId },
  });

  await pb.collection('users').update(userId, {
    stripe_customer_id: customer.id,
  });

  return customer.id;
};

const resolveMarket = (market) => {
  if (typeof market !== 'string' || !Object.hasOwn(MARKET_CURRENCIES, market)) {
    return null;
  }

  return MARKET_CURRENCIES[market];
};

// POST /stripe/checkout
// Start a hosted Stripe Checkout session for a new WhatsApp AI Agent
// subscription. An account may hold several independent Agent subscriptions
// (one per WhatsApp number), so there is deliberately no duplicate-plan guard.
router.post('/checkout', authenticate, billingRateLimit, async (req, res) => {
  const userId = req.userId;
  const { plan, market } = req.body;
  // Optional and defaulted rather than required: existing callers that don't
  // send it yet (or send it later during a retry) should still get monthly,
  // not a 400.
  const interval = req.body.interval ?? 'monthly';

  if (!plan || !market) {
    return res.status(400).json({ error: 'Missing required fields: plan, market' });
  }

  if (typeof plan !== 'string' || !Object.hasOwn(PLANS, plan)) {
    return res.status(400).json({ error: 'Unknown plan' });
  }

  if (interval !== 'monthly' && interval !== 'annual') {
    return res.status(400).json({ error: 'Unknown interval' });
  }

  const currency = resolveMarket(market);
  if (!currency) {
    return res.status(400).json({ error: 'Unknown market' });
  }

  let stripeCustomerId;
  try {
    stripeCustomerId = await getOrCreateStripeCustomer(userId);
  } catch (error) {
    throw new Error(`Failed to get or create Stripe customer: ${error.message}`);
  }

  // The implementation & setup fee is charged once per account, on the first
  // Agent only — so this counts every subscription the account has ever had,
  // regardless of plan or current status.
  let needsSetupFee;
  try {
    const existing = await pb.collection('subscriptions').getList(1, 1, {
      filter: `user_id = "${userId}"`,
    });
    needsSetupFee = existing.totalItems === 0;
  } catch (error) {
    throw new Error(`Failed to check existing subscriptions: ${error.message}`);
  }

  const lineItems = [{ price: PLANS[plan].priceId[interval], quantity: 1 }];
  if (needsSetupFee) {
    lineItems.push({ price: SETUP_FEE_PRICE_ID, quantity: 1 });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: stripeCustomerId,
        // An explicit currency overrides Stripe's automatic IP-based
        // localization, so the market the customer picked wins and each
        // Price resolves to its matching currency_options entry.
        currency,
        line_items: lineItems,
        success_url: `${APP_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/dashboard?checkout=cancelled`,
        metadata: { userId, plan, market, interval },
        // Duplicated onto the Subscription because renewal and
        // cancellation events carry no Session context.
        subscription_data: {
          metadata: { userId, plan, market, interval },
        },
      },
      // Scoped to a coarse time bucket rather than to user+plan: unlike the
      // old direct subscription create, repeat Checkout Sessions are a
      // legitimate flow (a second Agent, or retrying after abandoning one),
      // so this only collapses a fast double-click. interval is folded in so
      // a monthly and annual attempt in the same minute don't collide.
      { idempotencyKey: `checkout-${userId}-${plan}-${market}-${interval}-${Math.floor(Date.now() / 60000)}` }
    );
  } catch (error) {
    throw new Error(`Failed to create Stripe Checkout session: ${error.message}`);
  }

  res.json({ url: session.url });
});

// POST /stripe/topup
// One-off message top-up purchase for an existing plan.
router.post('/topup', authenticate, billingRateLimit, async (req, res) => {
  const userId = req.userId;
  const { topup, market } = req.body;

  if (!topup || !market) {
    return res.status(400).json({ error: 'Missing required fields: topup, market' });
  }

  if (typeof topup !== 'string' || !Object.hasOwn(TOPUPS, topup)) {
    return res.status(400).json({ error: 'Unknown topup' });
  }

  const currency = resolveMarket(market);
  if (!currency) {
    return res.status(400).json({ error: 'Unknown market' });
  }

  let stripeCustomerId;
  try {
    stripeCustomerId = await getOrCreateStripeCustomer(userId);
  } catch (error) {
    throw new Error(`Failed to get or create Stripe customer: ${error.message}`);
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer: stripeCustomerId,
        currency,
        line_items: [{ price: TOPUPS[topup].priceId, quantity: 1 }],
        success_url: `${APP_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/dashboard?checkout=cancelled`,
        metadata: { userId, topup, market },
      },
      { idempotencyKey: `topup-${userId}-${topup}-${market}-${Math.floor(Date.now() / 60000)}` }
    );
  } catch (error) {
    throw new Error(`Failed to create Stripe Checkout session: ${error.message}`);
  }

  res.json({ url: session.url });
});

// POST /stripe/cancel-subscription
// Schedule cancellation at the end of the current paid period, per the agreed
// customer policy: no partial refund, and the Agent stays active until then.
router.post('/cancel-subscription', authenticate, billingRateLimit, async (req, res) => {
  const { subscriptionId } = req.body;

  if (!subscriptionId) {
    return res.status(400).json({ error: 'Missing required field: subscriptionId' });
  }

  if (!isValidStripeSubscriptionId(subscriptionId)) {
    return res.status(400).json({ error: 'Invalid subscriptionId format' });
  }

  // Ownership must be confirmed before touching Stripe, and a not-found vs.
  // not-yours mismatch is deliberately reported identically (404) so a caller
  // can't use this endpoint to probe which subscription ids exist.
  let subscriptionRecord;
  try {
    subscriptionRecord = await pb
      .collection('subscriptions')
      .getFirstListItem(`stripe_subscription_id = "${subscriptionId}"`);
  } catch (error) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  if (subscriptionRecord.user_id !== req.userId) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  let subscription;
  try {
    subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (error) {
    throw new Error(`Failed to cancel Stripe subscription: ${error.message}`);
  }

  // The PocketBase record stays 'active' on purpose — it still is, until the
  // period ends. customer.subscription.deleted flips it to 'cancelled' when
  // Stripe actually finalizes the cancellation.
  const periodEnd = getPeriodEnd(subscription);

  res.json({
    status: subscriptionRecord.status,
    cancelAtPeriodEnd: true,
    cancelsOn: periodEnd ? periodEnd.toISOString() : null,
  });
});

// POST /stripe/pause-subscription
// Pause or resume a Stripe subscription belonging to the authenticated user.
// Replaces the frontend's direct `pb.collection('subscriptions').update(...)`
// call, which Fix 1 now blocks with a PocketBase-rule 403 (subscriptions
// updateRule is superuser-only) — the PocketBase status field must stay in
// sync with what Stripe is actually doing, so only the server should write it.
router.post('/pause-subscription', authenticate, billingRateLimit, async (req, res) => {
  const { subscriptionId, paused } = req.body;

  if (!subscriptionId) {
    return res.status(400).json({ error: 'Missing required field: subscriptionId' });
  }

  if (!isValidStripeSubscriptionId(subscriptionId)) {
    return res.status(400).json({ error: 'Invalid subscriptionId format' });
  }

  if (typeof paused !== 'boolean') {
    return res.status(400).json({ error: 'Missing or invalid required field: paused' });
  }

  // Same ownership-before-Stripe pattern as cancel-subscription: a mismatch
  // between "doesn't exist" and "isn't yours" is reported identically (404).
  let subscriptionRecord;
  try {
    subscriptionRecord = await pb
      .collection('subscriptions')
      .getFirstListItem(`stripe_subscription_id = "${subscriptionId}"`);
  } catch (error) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  if (subscriptionRecord.user_id !== req.userId) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  try {
    await stripe.subscriptions.update(subscriptionId, {
      pause_collection: paused ? { behavior: 'void' } : '',
    });
  } catch (error) {
    throw new Error(`Failed to update Stripe subscription pause state: ${error.message}`);
  }

  const newStatus = paused ? 'paused' : 'active';
  try {
    await pb.collection('subscriptions').update(subscriptionRecord.id, {
      status: newStatus,
    });
  } catch (error) {
    logger.warn(`Failed to update subscription status in PocketBase: ${error.message}`);
  }

  res.json({ status: newStatus, plan: subscriptionRecord.plan });
});

// GET /stripe/invoices/:userId
// Retrieve the authenticated user's own invoices from Stripe
router.get('/invoices/:userId', authenticate, async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'Missing required parameter: userId' });
  }

  if (userId !== req.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Get user's Stripe customer ID
  let stripeCustomerId;
  try {
    const userRecord = await pb.collection('users').getOne(userId);
    stripeCustomerId = userRecord.stripe_customer_id;

    if (!stripeCustomerId) {
      return res.json([]); // No Stripe customer, return empty invoices
    }
  } catch (error) {
    throw new Error(`Failed to get user record: ${error.message}`);
  }

  // Retrieve invoices from Stripe
  let invoices;
  try {
    const invoiceList = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 100,
    });
    invoices = invoiceList.data;
  } catch (error) {
    throw new Error(`Failed to retrieve invoices from Stripe: ${error.message}`);
  }

  // Format invoices for response
  const formattedInvoices = invoices.map((invoice) => ({
    id: invoice.id,
    date: new Date(invoice.created * 1000).toISOString(),
    amount: invoice.amount_paid / 100, // Convert from cents to major units
    currency: invoice.currency,
    status: invoice.status,
    pdfUrl: invoice.invoice_pdf,
  }));

  res.json(formattedInvoices);
});

// Resolve the stripe_subscription_id an invoice belongs to. Stripe returns it
// at different depths depending on API version (top-level on older versions,
// under parent.subscription_details on 2025-04-30+).
const getInvoiceSubscriptionId = (invoice) =>
  (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id)
  ?? invoice.parent?.subscription_details?.subscription
  ?? null;

const findSubscriptionRecord = async (stripeSubscriptionId) => {
  if (!isValidStripeSubscriptionId(stripeSubscriptionId)) {
    return null;
  }

  return pb
    .collection('subscriptions')
    .getFirstListItem(`stripe_subscription_id = "${stripeSubscriptionId}"`)
    .catch(() => null);
};

const handleSubscriptionCheckout = async (session) => {
  const { userId, plan } = session.metadata || {};
  // Defaulted rather than required: sessions created before this field
  // existed carry no `interval` metadata at all.
  const interval = session.metadata?.interval === 'annual' ? 'annual' : 'monthly';

  if (!userId || !plan || !Object.hasOwn(PLANS, plan)) {
    logger.warn(`Checkout session ${session.id} missing or invalid userId/plan metadata`);
    return;
  }

  const subscription = session.subscription;
  if (!subscription || typeof subscription === 'string') {
    logger.warn(`Checkout session ${session.id} has no expanded subscription`);
    return;
  }

  // NOT subscription.items.data[].price.unit_amount: a Price's unit_amount is
  // fixed to that Price's own default currency (sgd for every plan here) and
  // does not change when a Checkout Session bills a different currency via
  // currency_options — reading it would silently record the SGD amount for
  // every MYR customer. The Checkout Session's own line items are already
  // localized to whatever currency this session actually charged, so those
  // are the source of truth for what was billed, not the shared Price object.
  // Note: despite the field name, for an annual subscription this stores the
  // *annual* charge amount, not a monthly figure — `billing_interval` below
  // is what disambiguates it.
  const recurringLineItem = session.line_items?.data?.find((li) => li.price?.recurring);
  const monthlyCost = recurringLineItem ? recurringLineItem.amount_total / 100 : 0;
  const currency = session.currency;
  const periodEnd = getPeriodEnd(subscription);

  try {
    await pb.collection('subscriptions').create({
      user_id: userId,
      plan,
      status: 'active',
      subscription_date: new Date(),
      next_billing_date: periodEnd,
      monthly_cost: monthlyCost,
      currency,
      billing_interval: interval,
      stripe_subscription_id: subscription.id,
    });
  } catch (error) {
    logger.warn(`Failed to store subscription in PocketBase: ${error.message}`);
  }
};

const handleTopupCheckout = async (session) => {
  const { userId, topup } = session.metadata || {};

  if (!userId || !topup || !Object.hasOwn(TOPUPS, topup)) {
    logger.warn(`Checkout session ${session.id} missing or invalid userId/topup metadata`);
    return;
  }

  try {
    await pb.collection('topups').create({
      user_id: userId,
      plan: TOPUPS[topup].plan,
      messages: TOPUPS[topup].messages,
      amount: (session.amount_total ?? 0) / 100,
      currency: session.currency,
      stripe_checkout_session_id: session.id,
      purchased_at: new Date(),
    });
  } catch (error) {
    logger.warn(`Failed to store topup in PocketBase: ${error.message}`);
  }
};

// POST /stripe/webhook
// Handle Stripe webhook events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.warn('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    logger.error(`Webhook signature verification failed: ${error.message}`);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const sessionId = event.data.object.id;
        logger.info(`Checkout session completed: ${sessionId}`);

        // The event payload carries unexpanded ids, and both branches
        // below need the subscription / line item detail behind them.
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['subscription', 'line_items'],
        });

        if (session.mode === 'subscription') {
          await handleSubscriptionCheckout(session);
        } else if (session.mode === 'payment') {
          await handleTopupCheckout(session);
        } else {
          logger.debug(`Unhandled checkout session mode: ${session.mode}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        logger.info(`Invoice payment succeeded: ${invoice.id}`);

        if (!isValidStripeInvoiceId(invoice.id)) {
          logger.warn(`Unexpected invoice id format from webhook: ${invoice.id}`);
          break;
        }

        const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);
        const record = await findSubscriptionRecord(stripeSubscriptionId);

        if (!record) {
          // One-off top-up invoices have no subscription; nothing to renew.
          logger.debug(`No subscription record for invoice ${invoice.id}`);
          break;
        }

        try {
          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          const periodEnd = getPeriodEnd(subscription);

          await pb.collection('subscriptions').update(record.id, {
            status: 'active',
            ...(periodEnd ? { next_billing_date: periodEnd } : {}),
          });
        } catch (error) {
          logger.warn(`Failed to update subscription in PocketBase: ${error.message}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        logger.info(`Invoice payment failed: ${invoice.id}`);

        if (!isValidStripeInvoiceId(invoice.id)) {
          logger.warn(`Unexpected invoice id format from webhook: ${invoice.id}`);
          break;
        }

        const record = await findSubscriptionRecord(getInvoiceSubscriptionId(invoice));

        if (!record) {
          logger.debug(`No subscription record for invoice ${invoice.id}`);
          break;
        }

        // Marked past_due only. Retry cadence and the eventual cancel are
        // Stripe's Smart Retries / dunning settings, configured in the
        // Dashboard — deliberately not reimplemented here.
        try {
          await pb.collection('subscriptions').update(record.id, {
            status: 'past_due',
          });
        } catch (error) {
          logger.warn(`Failed to update subscription in PocketBase: ${error.message}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        logger.info(`Subscription deleted: ${subscription.id}`);

        // Fires when a cancel_at_period_end subscription reaches its
        // period end, or when Stripe's own dunning gives up.
        const record = await findSubscriptionRecord(subscription.id);

        if (!record) {
          logger.warn(`No subscription record for ${subscription.id}`);
          break;
        }

        try {
          await pb.collection('subscriptions').update(record.id, {
            status: 'cancelled',
          });
        } catch (error) {
          logger.warn(`Failed to update subscription in PocketBase: ${error.message}`);
        }
        break;
      }

      default:
        logger.debug(`Unhandled webhook event type: ${event.type}`);
    }
  } catch (error) {
    logger.error(`Error processing webhook: ${error.message}`);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  res.json({ received: true });
});

export default router;
