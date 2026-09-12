// Provisions an isolated Chatwoot Account per customer (per the user's
// confirmed decision — full data isolation, not a shared account with
// per-customer inboxes). Built entirely against Chatwoot's own Platform API
// (read directly from this Chatwoot instance's Rails source — see project
// memory for the exact controllers/policies checked before writing this):
//
//   PlatformApp (CHATWOOT_PLATFORM_TOKEN)
//     -> creates Accounts, Users, AgentBots, links Users to Accounts
//   Regular per-account API (needs a real administrator USER token, not a
//   bot token — InboxPolicy#create? requires @account_user.administrator?,
//   confirmed by reading the policy source; an AgentBot token 403s here)
//     -> creates the WhatsApp Cloud API inbox itself
//
// CHATWOOT_SERVICE_USER_ID / _TOKEN is a single dedicated Chatwoot user
// ("Vouza Backend") created once and added as administrator to every new
// customer account, purely so this service always has a valid token for the
// inbox-creation step without needing to extract each customer's own token.

const CHATWOOT_BASE = 'https://inbox.vouza.ai';
const PLATFORM_TOKEN = process.env.CHATWOOT_PLATFORM_TOKEN;
const SERVICE_USER_ID = process.env.CHATWOOT_SERVICE_USER_ID;
const SERVICE_USER_TOKEN = process.env.CHATWOOT_SERVICE_USER_TOKEN;

const platformRequest = async (method, path, body) => {
	if (!PLATFORM_TOKEN) {
		throw new Error('CHATWOOT_PLATFORM_TOKEN not configured');
	}

	const res = await fetch(`${CHATWOOT_BASE}/platform/api/v1${path}`, {
		method,
		headers: {
			api_access_token: PLATFORM_TOKEN,
			'Content-Type': 'application/json',
		},
		body: body ? JSON.stringify(body) : undefined,
	});

	const text = await res.text();
	const data = text ? JSON.parse(text) : {};
	if (!res.ok) {
		throw new Error(`Chatwoot Platform API ${method} ${path} failed: ${JSON.stringify(data)}`);
	}
	return data;
};

const accountRequest = async (method, path, body) => {
	if (!SERVICE_USER_TOKEN) {
		throw new Error('CHATWOOT_SERVICE_USER_TOKEN not configured');
	}

	const res = await fetch(`${CHATWOOT_BASE}/api/v1${path}`, {
		method,
		headers: {
			api_access_token: SERVICE_USER_TOKEN,
			'Content-Type': 'application/json',
		},
		body: body ? JSON.stringify(body) : undefined,
	});

	const text = await res.text();
	const data = text ? JSON.parse(text) : {};
	if (!res.ok) {
		throw new Error(`Chatwoot API ${method} ${path} failed: ${JSON.stringify(data)}`);
	}
	return data;
};

export const createChatwootAccount = async (name) => {
	const account = await platformRequest('POST', '/accounts', { name });

	// The service user needs to be an administrator on every new account, or
	// nothing else here (including inbox creation) can authenticate.
	await platformRequest('POST', `/accounts/${account.id}/account_users`, {
		user_id: Number(SERVICE_USER_ID),
		role: 'administrator',
	});

	return account.id;
};

// Reuses an existing Chatwoot user if this email already has one (Chatwoot's
// own Platform API does this automatically — User.from_email(email) || new).
// The password is required by Chatwoot's own validation but never used —
// the customer signs in via the SSO link from getChatwootSsoLoginUrl, not a
// password, so this is generated and immediately discarded.
export const createOrFindChatwootUser = async (name, email) => {
	const crypto = await import('node:crypto');
	const password = `${crypto.randomBytes(20).toString('hex')}A1!`;
	const user = await platformRequest('POST', '/users', { name, email, password });
	return user.id;
};

export const addUserToAccount = async (accountId, userId, role = 'administrator') => {
	await platformRequest('POST', `/accounts/${accountId}/account_users`, { user_id: userId, role });
};

// A one-click, no-password login link for the customer — see project memory
// for why (Platform API's /users/:id/login action), used in the final
// "your inbox is ready" email instead of asking them to set a password.
export const getChatwootSsoLoginUrl = async (userId) => {
	const res = await platformRequest('GET', `/users/${userId}/login`);
	return res.url;
};

// This is the actual trigger mechanism — NOT a generic Account-level
// webhook (there are none configured anywhere on this instance, confirmed
// by querying Webhook.all directly). Chatwoot forwards conversation events
// to an AgentBot's outgoing_url once that bot is set on an inbox, which is
// how the demo bot's inbox reaches n8n today (AgentBot id 1, "Vouza AI
// Assistant", outgoing_url -> the demo's n8n webhook path). Every customer
// needs their own AgentBot pointed at their own cloned workflow's webhook.
export const createAgentBot = async (accountId, name, outgoingUrl) => {
	const bot = await platformRequest('POST', '/agent_bots', { name, account_id: accountId, outgoing_url: outgoingUrl });
	return bot.id;
};

export const setInboxAgentBot = async (accountId, inboxId, agentBotId) => {
	await accountRequest('POST', `/accounts/${accountId}/inboxes/${inboxId}/set_agent_bot`, { agent_bot: agentBotId });
};

// metaAccessToken: our own META_SYSTEM_USER_TOKEN — Chatwoot stores it as
// this inbox's own provider_config.api_key and uses it both to validate the
// number (a real remote check against Meta, not just a format check) and to
// set up the WABA's webhook subscription pointed at Chatwoot itself.
export const createWhatsappInbox = async (accountId, { name, phoneNumber, wabaId, metaAccessToken }) => {
	const inbox = await accountRequest('POST', `/accounts/${accountId}/inboxes`, {
		name,
		channel: {
			type: 'whatsapp',
			phone_number: phoneNumber,
			provider: 'whatsapp_cloud',
			provider_config: {
				business_account_id: wabaId,
				api_key: metaAccessToken,
			},
		},
	});
	return inbox.id;
};
