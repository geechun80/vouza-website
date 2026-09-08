import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import authenticate from '../middleware/auth.js';
import { CHARACTER_PRICES } from '../constants/pricing.js';
import { billingRateLimit } from '../middleware/global-rate-limit.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const STRIPE_SUBSCRIPTION_ID_PATTERN = /^sub_[A-Za-z0-9]+$/;
const STRIPE_INVOICE_ID_PATTERN = /^in_[A-Za-z0-9]+$/;
// PocketBase record ids: 15-char lowercase base36, per the autogeneratePattern
// on every collection's id field (see pb_migrations) — validated before this
// value is interpolated into a PocketBase filter string.
const POCKETBASE_ID_PATTERN = /^[a-z0-9]{15}$/;
const isValidStripeSubscriptionId = (id) => typeof id === 'string' && STRIPE_SUBSCRIPTION_ID_PATTERN.test(id);
const isValidStripeInvoiceId = (id) => typeof id === 'string' && STRIPE_INVOICE_ID_PATTERN.test(id);
const isValidPocketBaseId = (id) => typeof id === 'string' && POCKETBASE_ID_PATTERN.test(id);

// POST /stripe/create-subscription
// Create a Stripe subscription for the authenticated user
router.post('/create-subscription', authenticate, billingRateLimit, async (req, res) => {
  const userId = req.userId;
  const { characterId } = req.body;

  if (!characterId) {
    return res.status(400).json({
      error: 'Missing required field: characterId',
    });
  }

  if (!isValidPocketBaseId(characterId)) {
    return res.status(400).json({ error: 'Invalid characterId format' });
  }

  const monthlyPrice = CHARACTER_PRICES[characterId];

  if (monthlyPrice === undefined) {
    return res.status(400).json({ error: 'Unknown characterId' });
  }

  // Idempotency / duplicate-subscription guard: a retried click or a second
  // tab could otherwise create two Stripe subscriptions (and two PocketBase
  // records) for the same user+character. characterId is already validated
  // above, and userId comes from the authenticated session, not the body.
  try {
    await pb
      .collection('subscriptions')
      .getFirstListItem(`user_id = "${userId}" && character_id = "${characterId}" && status != "cancelled"`);
    return res.status(409).json({ error: 'Already subscribed to this character' });
  } catch (error) {
    // getFirstListItem throws (404) when no match is found — that's the
    // expected/normal path here, so fall through and create the subscription.
  }

  // Get or create Stripe customer for this user
  let stripeCustomerId;
  try {
    const userRecord = await pb.collection('users').getOne(userId);
    stripeCustomerId = userRecord.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: { userId, characterId },
      });
      stripeCustomerId = customer.id;

      // Update user record with Stripe customer ID
      await pb.collection('users').update(userId, {
        stripe_customer_id: stripeCustomerId,
      });
    }
  } catch (error) {
    throw new Error(`Failed to get or create Stripe customer: ${error.message}`);
  }

  // Create subscription
  // The idempotency key ties this Stripe call to this user+character pair, so
  // a client retry (e.g. a double-click before the first response lands)
  // reuses the original subscription instead of creating a second one.
  let subscription;
  try {
    subscription = await stripe.subscriptions.create(
      {
        customer: stripeCustomerId,
        items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Character Subscription - ${characterId}`,
                metadata: { characterId },
              },
              unit_amount: Math.round(monthlyPrice * 100), // Convert to cents
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        metadata: { userId, characterId },
      },
      { idempotencyKey: `sub-${userId}-${characterId}` }
    );
  } catch (error) {
    throw new Error(`Failed to create Stripe subscription: ${error.message}`);
  }

  // Store subscription in PocketBase
  try {
    await pb.collection('subscriptions').create({
      user_id: userId,
      character_id: characterId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: stripeCustomerId,
      status: subscription.status,
      monthly_price: monthlyPrice,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
    });
  } catch (error) {
    logger.warn(`Failed to store subscription in PocketBase: ${error.message}`);
  }

  const nextBillingDate = new Date(subscription.current_period_end * 1000);

  res.json({
    subscriptionId: subscription.id,
    status: subscription.status,
    nextBillingDate: nextBillingDate.toISOString(),
  });
});

// POST /stripe/cancel-subscription
// Cancel a Stripe subscription belonging to the authenticated user
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

  // Cancel subscription in Stripe
  try {
    await stripe.subscriptions.del(subscriptionId);
  } catch (error) {
    throw new Error(`Failed to cancel Stripe subscription: ${error.message}`);
  }

  // Update subscription status in PocketBase
  try {
    await pb.collection('subscriptions').update(subscriptionRecord.id, {
      status: 'cancelled',
    });
  } catch (error) {
    logger.warn(`Failed to update subscription status in PocketBase: ${error.message}`);
  }

  res.json({ status: 'cancelled' });
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

  res.json({ status: newStatus });
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
    amount: invoice.amount_paid / 100, // Convert from cents to dollars
    status: invoice.status,
    pdfUrl: invoice.invoice_pdf,
  }));

  res.json(formattedInvoices);
});

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
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        logger.info(`Invoice payment succeeded: ${invoice.id}`);

        if (!isValidStripeInvoiceId(invoice.id)) {
          logger.warn(`Unexpected invoice id format from webhook: ${invoice.id}`);
          break;
        }

        // Update invoice status in PocketBase
        try {
          const existingInvoice = await pb
            .collection('invoices')
            .getFirstListItem(`stripe_invoice_id = "${invoice.id}"`)
            .catch(() => null);

          if (existingInvoice) {
            await pb.collection('invoices').update(existingInvoice.id, {
              status: 'paid',
            });
          } else {
            // Create new invoice record
            await pb.collection('invoices').create({
              stripe_invoice_id: invoice.id,
              stripe_customer_id: invoice.customer,
              amount: invoice.amount_paid / 100,
              status: 'paid',
              date: new Date(invoice.created * 1000),
              pdf_url: invoice.invoice_pdf,
            });
          }
        } catch (error) {
          logger.warn(`Failed to update invoice in PocketBase: ${error.message}`);
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

        // Update invoice status in PocketBase
        try {
          const existingInvoice = await pb
            .collection('invoices')
            .getFirstListItem(`stripe_invoice_id = "${invoice.id}"`)
            .catch(() => null);

          if (existingInvoice) {
            await pb.collection('invoices').update(existingInvoice.id, {
              status: 'failed',
            });
          } else {
            // Create new invoice record
            await pb.collection('invoices').create({
              stripe_invoice_id: invoice.id,
              stripe_customer_id: invoice.customer,
              amount: invoice.amount_due / 100,
              status: 'failed',
              date: new Date(invoice.created * 1000),
              pdf_url: invoice.invoice_pdf,
            });
          }
        } catch (error) {
          logger.warn(`Failed to update invoice in PocketBase: ${error.message}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        logger.info(`Subscription deleted: ${subscription.id}`);

        if (!isValidStripeSubscriptionId(subscription.id)) {
          logger.warn(`Unexpected subscription id format from webhook: ${subscription.id}`);
          break;
        }

        // Update subscription status in PocketBase
        try {
          const existingSubscription = await pb
            .collection('subscriptions')
            .getFirstListItem(`stripe_subscription_id = "${subscription.id}"`)
            .catch(() => null);

          if (existingSubscription) {
            await pb.collection('subscriptions').update(existingSubscription.id, {
              status: 'cancelled',
            });
          }
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