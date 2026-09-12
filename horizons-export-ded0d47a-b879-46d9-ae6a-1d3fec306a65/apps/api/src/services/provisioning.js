import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import {
	createChatwootAccount,
	createOrFindChatwootUser,
	addUserToAccount,
	getChatwootSsoLoginUrl,
	createWhatsappInbox,
	createAgentBot,
	setInboxAgentBot,
} from './chatwoot.js';
import { createCustomerOpenRouterKey, OPENROUTER_PLAN_LIMITS_USD } from './openrouter.js';
import { createOpenRouterCredential, cloneCustomerWorkflow, activateWorkflow } from './n8n.js';

const N8N_WEBHOOK_BASE = 'https://n8n-oymt.srv1530096.hstgr.cloud/webhook';

// Runs the whole Phase 3 chain for one subscription once its WhatsApp
// number is registered with Meta (called right after that succeeds, from
// the same poll cycle — see whatsapp-onboarding-poll.js). Deliberately NOT
// self-healing on partial failure: if any step throws, nothing here is
// rolled back and the caller records the error on the subscription instead
// of silently retrying next cycle, since a bare retry-everything would
// create a second Chatwoot account/OpenRouter key/n8n workflow alongside
// whatever the failed attempt already made. A stuck subscription needs a
// human to look at provisioning_error and clean up before retrying — an
// acceptable tradeoff at current signup volume, not built as fully
// idempotent distributed-transaction machinery.
export const provisionCustomer = async (subscription, wabaId) => {
	const user = await pb.collection('users').getOne(subscription.user_id);
	const businessName = subscription.business_name || user.name || 'this business';
	const businessInfoBlock =
		[subscription.business_description, subscription.business_key_facts].filter(Boolean).join(' ') ||
		'No additional details provided yet — ask the customer what they\'d like their Agent to know.';
	const businessTone = subscription.business_tone || 'friendly';

	const accountId = await createChatwootAccount(businessName);
	const chatwootUserId = await createOrFindChatwootUser(user.name || businessName, user.email);
	await addUserToAccount(accountId, chatwootUserId, 'administrator');
	const ssoUrl = await getChatwootSsoLoginUrl(chatwootUserId);

	const inboxId = await createWhatsappInbox(accountId, {
		name: `${businessName} WhatsApp`,
		phoneNumber: subscription.whatsapp_number_e164,
		wabaId,
		metaAccessToken: process.env.META_SYSTEM_USER_TOKEN,
	});

	const limitUsd = OPENROUTER_PLAN_LIMITS_USD[subscription.plan] || OPENROUTER_PLAN_LIMITS_USD.basic;
	const { key, hash } = await createCustomerOpenRouterKey(`sub-${subscription.id}`, limitUsd);
	const credentialName = `OpenRouter - ${subscription.id}`;
	const credId = await createOpenRouterCredential(credentialName, key);

	const workflowId = await cloneCustomerWorkflow({
		subscriptionId: subscription.id,
		businessName,
		businessInfoBlock,
		businessTone,
		chatwootAccountId: accountId,
		chatwootCustomerUserId: chatwootUserId,
		customerEmail: user.email,
		openRouterCredentialId: credId,
		openRouterCredentialName: credentialName,
	});

	const agentBotId = await createAgentBot(accountId, `${businessName} AI`, `${N8N_WEBHOOK_BASE}/vouza-chatwoot-bot-${subscription.id}`);
	await setInboxAgentBot(accountId, inboxId, agentBotId);
	await activateWorkflow(workflowId);

	await pb.collection('subscriptions').update(subscription.id, {
		whatsapp_connected: true,
		chatwoot_account_id: accountId,
		chatwoot_user_id: chatwootUserId,
		chatwoot_inbox_id: inboxId,
		n8n_workflow_id: workflowId,
		openrouter_key_hash: hash,
		chatwoot_sso_url: ssoUrl,
		fully_provisioned: true,
	});

	logger.info(
		`provisioning: fully provisioned subscription ${subscription.id} (Chatwoot account ${accountId}, inbox ${inboxId}, n8n workflow ${workflowId})`,
	);
};
