// Price IDs only — the actual amounts, currencies (sgd/myr via each Price's
// currency_options) and tax_behavior live in Stripe and are the source of
// truth. Nothing here should ever be used to compute what to charge; it exists
// so a caller can't put an arbitrary price id in the request body.

// Annual Prices are a separate Stripe object per plan (10% off, same
// currency_options/tax_behavior shape as monthly) — not a discount coupon
// applied to the monthly Price — so each plan needs both ids.
const PLANS = {
    basic: { name: 'Basic', priceId: { monthly: 'price_1UE32GHXBGyE1bGnBmjm2Z0p', annual: 'price_1UE3ZVHXBGyE1bGnfVhfRXBS' } },
    advanced: { name: 'Advanced', priceId: { monthly: 'price_1UE32JHXBGyE1bGnsaNryKnY', annual: 'price_1UE3ZaHXBGyE1bGn12KspFW4' } },
    premium: { name: 'Premium', priceId: { monthly: 'price_1UE32NHXBGyE1bGno88NQfyM', annual: 'price_1UE3ZdHXBGyE1bGnPp9eBej4' } },
};

// Charged once per account, on the first Agent subscription only — an account
// can hold several independent WhatsApp AI Agent subscriptions.
const SETUP_FEE_PRICE_ID = 'price_1UE32RHXBGyE1bGnF1kgPHNh';

// No Premium entry: Premium top-ups are custom/agreed per the pricing policy,
// so there is deliberately no self-serve Price for them.
const TOPUPS = {
    basic_1000: { plan: 'basic', messages: 1000, priceId: 'price_1UE32bHXBGyE1bGn9cafbZl9' },
    basic_2000: { plan: 'basic', messages: 2000, priceId: 'price_1UE32eHXBGyE1bGnVByG2Z6D' },
    advanced_5000: { plan: 'advanced', messages: 5000, priceId: 'price_1UE32lHXBGyE1bGnb8Mx2wC5' },
    advanced_10000: { plan: 'advanced', messages: 10000, priceId: 'price_1UE32oHXBGyE1bGn0ObHpVWN' },
};

// A manually-selected market maps straight to a currency here. Passing an
// explicit `currency` on Checkout Session creation overrides Stripe's
// automatic IP-based localization, so the market the customer picked is the
// one they get billed in.
const MARKET_CURRENCIES = {
    sg: 'sgd',
    my: 'myr',
};

export { PLANS, SETUP_FEE_PRICE_ID, TOPUPS, MARKET_CURRENCIES };
