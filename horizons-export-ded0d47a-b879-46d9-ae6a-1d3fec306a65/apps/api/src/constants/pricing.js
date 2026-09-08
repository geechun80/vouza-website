// Prices live here, not on the client, so a caller can't set their own
// unit_amount by editing the request body. TODO(product): populate this with
// the real `id -> monthly_price` pairs from the PocketBase `ai_characters`
// collection before connecting live Stripe keys — every id a subscribe
// request can send must have an entry here or it will be rejected with 400.
const CHARACTER_PRICES = {
    // 'REPLACE_WITH_REAL_CHARACTER_ID': 29.99,
};

export { CHARACTER_PRICES };
