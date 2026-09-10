// Single source of truth for the 3 WhatsApp AI plans on both the public
// PricingPage and the authenticated DashboardPage, so the two can't drift.
// Prices here are for display only — the actual charge always comes from the
// Stripe Price the backend resolves from `id`, never from these numbers.

export const MARKETS = [
  { id: 'sg', label: 'Singapore', currency: 'SGD' },
  { id: 'my', label: 'Malaysia', currency: 'MYR' },
];

// annualPrice is the full once-a-year charge (already ~10% below
// monthly * 12, rounded up to the nearest whole unit) — not a monthly rate.
export const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'For a single WhatsApp number getting started',
    features: ['1 WhatsApp AI Agent', 'Core automated replies', 'Message top-ups available'],
    recommended: false,
    price: { sg: 199, my: 499 },
    annualPrice: { sg: 2150, my: 5390 },
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'For growing teams with higher message volume',
    features: ['Everything in Basic', 'Higher message allowance', 'Larger top-up bundles'],
    recommended: true,
    price: { sg: 299, my: 899 },
    annualPrice: { sg: 3230, my: 9710 },
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For high-volume operations needing custom limits',
    features: ['Everything in Advanced', 'Priority support', 'Custom message agreements'],
    recommended: false,
    price: { sg: 799, my: 2499 },
    annualPrice: { sg: 8630, my: 26990 },
  },
];

// One-time fee, charged once per customer account regardless of plan or how
// many Agents they add.
export const SETUP_FEE = { sg: 679, my: 1999 };
