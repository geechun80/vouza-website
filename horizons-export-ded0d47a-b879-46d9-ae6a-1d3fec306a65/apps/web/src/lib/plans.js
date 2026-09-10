// Single source of truth for the 3 WhatsApp AI plans on both the public
// PricingPage and the authenticated DashboardPage, so the two can't drift.
// Prices here are for display only — the actual charge always comes from the
// Stripe Price the backend resolves from `id`, never from these numbers.
//
// The capability rows and top-up figures mirror the Package Capability Matrix
// (Section 3) and Usage/Top-Up Policy (Section 11) of
// "Vouza_AI_Full_Subscription_Customer_Process_Policy_SG_MY.docx", which is the
// commercial source of truth — keep the two in sync when either changes.

export const MARKETS = [
  { id: 'sg', label: 'Singapore', currency: 'SGD' },
  { id: 'my', label: 'Malaysia', currency: 'MYR' },
];

// Each feature `value` is one of:
//   true    — included in this plan (renders as a tick, no text)
//   false   — not part of this plan (renders dimmed with a dash)
//   string  — the specific allowance or tier for that capability
export const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Best for straightforward workflows',
    recommended: false,
    price: { sg: 199, my: 499 },
    annualPrice: { sg: 2150, my: 5390 },
    features: [
      { label: 'AI messages', value: '2,000 / month' },
      { label: 'Languages', value: 'Up to 2' },
      { label: 'AI Knowledge Base', value: true },
      { label: 'Smart routing', value: 'Limited' },
      { label: 'Human escalation', value: true },
      { label: 'Staff dashboard', value: 'Basic' },
      { label: 'Analytics', value: 'Basic' },
      { label: 'Daily reports', value: false },
      { label: 'Notifications', value: 'Basic' },
      { label: 'Automation', value: 'Basic' },
      { label: 'Monitoring', value: true },
      { label: 'Data retention', value: '15 days' },
      { label: 'Image interaction', value: 'Within allowance' },
      { label: 'WhatsApp Voice', value: false },
      { label: 'Twilio integration', value: false },
      { label: 'Video calling', value: false },
    ],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Best for growing, multilingual businesses',
    recommended: true,
    price: { sg: 299, my: 899 },
    annualPrice: { sg: 3230, my: 9710 },
    features: [
      { label: 'AI messages', value: '10,000 / month' },
      { label: 'Languages', value: 'Up to 4' },
      { label: 'AI Knowledge Base', value: true },
      { label: 'Smart routing', value: true },
      { label: 'Human escalation', value: true },
      { label: 'Staff dashboard', value: 'Advanced' },
      { label: 'Analytics', value: 'Advanced' },
      { label: 'Daily reports', value: true },
      { label: 'Notifications', value: 'Advanced' },
      { label: 'Automation', value: 'Advanced' },
      { label: 'Monitoring', value: true },
      { label: 'Data retention', value: '30 days' },
      { label: 'Image interaction', value: 'Within allowance' },
      { label: 'WhatsApp Voice', value: false },
      { label: 'Twilio integration', value: false },
      { label: 'Video calling', value: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Best for complex, richer communication workflows',
    recommended: false,
    price: { sg: 799, my: 2499 },
    annualPrice: { sg: 8630, my: 26990 },
    features: [
      { label: 'AI interactions', value: '10,000 / month' },
      { label: 'Languages', value: 'Up to 6' },
      { label: 'AI Knowledge Base', value: true },
      { label: 'Smart routing', value: 'Advanced' },
      { label: 'Human escalation', value: true },
      { label: 'Staff dashboard', value: 'Premium' },
      { label: 'Analytics', value: 'Premium' },
      { label: 'Daily reports', value: true },
      { label: 'Notifications', value: 'Premium' },
      { label: 'Automation', value: 'Premium' },
      { label: 'Monitoring', value: true },
      { label: 'Data retention', value: '30 days' },
      { label: 'Image interaction', value: '+ premium media' },
      { label: 'WhatsApp Voice', value: '1,000 min / month' },
      { label: 'Twilio integration', value: true },
      { label: 'Video calling', value: 'Twilio-powered' },
    ],
  },
];

// One-time fee, charged once per customer account regardless of plan or how
// many Agents they add.
export const SETUP_FEE = { sg: 679, my: 1999 };

// Recommended top-up structure. Top-ups buy extra usage on top of the current
// plan's allowance; they never change the underlying package. `options: null`
// means the plan's extra usage is quoted case by case rather than self-serve.
export const TOPUPS = [
  {
    plan: 'Basic',
    included: '2,000 AI messages / month',
    options: [
      { label: '+1,000 messages', price: { sg: 40, my: 100 } },
      { label: '+2,000 messages', price: { sg: 80, my: 200 } },
    ],
  },
  {
    plan: 'Advanced',
    included: '10,000 AI messages / month',
    options: [
      { label: '+5,000 messages', price: { sg: 170, my: 500 } },
      { label: '+10,000 messages', price: { sg: 340, my: 1000 } },
    ],
  },
  {
    plan: 'Premium',
    included: '10,000 AI interactions / month, plus premium media allowances',
    options: null,
  },
];
