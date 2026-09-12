import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Same server the demo bot's own n8n lives on — a separate workflow per
// customer, not a separate n8n instance (see project memory for why).
const N8N_BASE = 'https://n8n-oymt.srv1530096.hstgr.cloud';
const API_KEY = process.env.N8N_API_KEY;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, '../../../n8n-templates/customer-bot-template.json');

const n8nRequest = async (method, urlPath, body) => {
	if (!API_KEY) {
		throw new Error('N8N_API_KEY not configured');
	}

	const res = await fetch(`${N8N_BASE}/api/v1${urlPath}`, {
		method,
		headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
		body: body ? JSON.stringify(body) : undefined,
	});

	const text = await res.text();
	const data = text ? JSON.parse(text) : {};
	if (!res.ok) {
		throw new Error(`n8n API ${method} ${urlPath} failed: ${JSON.stringify(data)}`);
	}
	return data;
};

// One httpHeaderAuth credential per customer holding their own OpenRouter
// key — both the text and vision nodes in their cloned workflow reference
// this same credential, so a single spend cap covers both.
export const createOpenRouterCredential = async (name, openRouterKey) => {
	const cred = await n8nRequest('POST', '/credentials', {
		name,
		type: 'httpHeaderAuth',
		data: { name: 'Authorization', value: `Bearer ${openRouterKey}` },
	});
	return cred.id;
};

// Reads the checked-in template (see apps/n8n-templates/build-template.mjs
// for how it was derived from the live demo workflow, and project memory
// for the full design rationale) and substitutes every __PLACEHOLDER__ with
// this customer's real values, then creates it as a brand new, independent
// n8n workflow — the demo workflow itself is never touched.
export const cloneCustomerWorkflow = async ({
	subscriptionId,
	businessName,
	businessInfoBlock,
	businessTone,
	chatwootAccountId,
	chatwootCustomerUserId,
	customerEmail,
	openRouterCredentialId,
	openRouterCredentialName,
}) => {
	const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));

	// JSON.stringify + replace keeps every string properly escaped even if a
	// business's own text happens to contain a quote or backslash — safer
	// than substituting into the raw prompt string directly.
	let serialized = JSON.stringify(template);

	// A no-op for plain ids/numbers, but protects free-text fields (business
	// name/description, email) from breaking the surrounding JSON if they
	// ever contain a quote or backslash — applied uniformly so nothing here
	// depends on remembering which placeholder sits in which kind of context.
	const escape = (s) => JSON.stringify(String(s)).slice(1, -1);
	const replacements = {
		__WORKFLOW_NAME__: escape(`Customer Bot: ${businessName} (${subscriptionId})`),
		__WEBHOOK_PATH__: escape(`vouza-chatwoot-bot-${subscriptionId}`),
		__CHATWOOT_ACCOUNT_ID__: escape(chatwootAccountId),
		__CHATWOOT_API_TOKEN__: escape(process.env.CHATWOOT_SERVICE_USER_TOKEN),
		__SUBSCRIPTION_ID__: escape(subscriptionId),
		__BUSINESS_NAME__: escape(businessName),
		__BUSINESS_INFO_BLOCK__: escape(businessInfoBlock),
		__BUSINESS_TONE__: escape(businessTone || 'friendly'),
		__CUSTOMER_EMAIL__: escape(customerEmail),
		__CHATWOOT_CUSTOMER_USER_ID__: escape(chatwootCustomerUserId),
		__OPENROUTER_CREDENTIAL_ID__: escape(openRouterCredentialId),
		__OPENROUTER_CREDENTIAL_NAME__: escape(openRouterCredentialName),
	};

	for (const [token, value] of Object.entries(replacements)) {
		serialized = serialized.split(token).join(value);
	}

	const filled = JSON.parse(serialized);
	const created = await n8nRequest('POST', '/workflows', {
		name: filled.name,
		nodes: filled.nodes,
		connections: filled.connections,
		settings: filled.settings,
	});

	return created.id;
};

export const activateWorkflow = async (workflowId) => {
	await n8nRequest('POST', `/workflows/${workflowId}/activate`);
};
