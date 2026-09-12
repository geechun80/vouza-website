const MANAGEMENT_TOKEN = process.env.OPENROUTER_MANAGEMENT_API_KEY;

// USD monthly spend caps per plan — calculated from nemotron-3.5-lightning's
// real per-token pricing against each plan's message allowance (+15%,
// rounded up), then raised to these fixed values by the user for headroom
// once image messages (routed to a pricier vision model) are folded in. See
// project memory for the calculation and the model-routing decision.
export const OPENROUTER_PLAN_LIMITS_USD = {
	basic: 10,
	advanced: 20,
	premium: 50,
};

// Creates a dedicated OpenRouter API key for one customer's Agent, with a
// hard monthly spend cap — so a single runaway conversation can't blow past
// what that plan is provisioned for. `name` should be unique enough to find
// again later (the subscription id is used for this).
export const createCustomerOpenRouterKey = async (name, limitUsd) => {
	if (!MANAGEMENT_TOKEN) {
		throw new Error('OPENROUTER_MANAGEMENT_API_KEY not configured');
	}

	const res = await fetch('https://openrouter.ai/api/v1/keys', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${MANAGEMENT_TOKEN}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ name, limit: limitUsd }),
	});

	const body = await res.json();
	if (!res.ok) {
		throw new Error(`OpenRouter key creation failed: ${JSON.stringify(body)}`);
	}

	// `key` is only ever returned on this create call — OpenRouter never
	// exposes it again after this response, so callers must persist it now.
	return { key: body.key, hash: body.data.hash };
};

export const deleteCustomerOpenRouterKey = async (hash) => {
	if (!MANAGEMENT_TOKEN) {
		throw new Error('OPENROUTER_MANAGEMENT_API_KEY not configured');
	}

	const res = await fetch(`https://openrouter.ai/api/v1/keys/${hash}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${MANAGEMENT_TOKEN}` },
	});

	if (!res.ok) {
		throw new Error(`OpenRouter key deletion failed: ${res.status}`);
	}
};
