import pb from '../utils/pocketbaseClient.js';
import logger from '../utils/logger.js';
import { provisionCustomer } from '../services/provisioning.js';

const GRAPH_VERSION = 'v21.0';
// Vouza's own Business Portfolio ID (Meta Business Settings URL), not the app
// ID — client_whatsapp_business_accounts is a business-level edge.
const BUSINESS_ID = '1251743831356708';

const graphGet = async (path, token) => {
	const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	return { ok: res.ok, body: await res.json() };
};

const graphPost = async (path, body, token) => {
	const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(body || {}),
	});
	return { ok: res.ok, body: await res.json() };
};

// Strip everything but leading + and digits so "+65 9123 4567" and
// "+6591234567" compare equal regardless of how either side formatted it.
const normalizePhone = (raw) => (raw || '').replace(/[^\d+]/g, '');

const generatePin = () => String(Math.floor(100000 + Math.random() * 900000));

// Meta's client_whatsapp_business_accounts API gives no way to tell which of
// our customers a newly-shared WABA belongs to, so this matches by the phone
// number each customer entered on /whatsapp-setup before starting Meta's
// flow (see whatsapp.js and project memory for why). Runs on an interval
// from main.js rather than being event-driven, since there's no webhook
// callback we can safely add without touching the live demo bot's shared
// app-level webhook subscription — see project memory for that tradeoff.
export const pollForNewWhatsAppNumbers = async () => {
	const token = process.env.META_SYSTEM_USER_TOKEN;
	if (!token) {
		return;
	}

	let pending;
	try {
		pending = await pb.collection('subscriptions').getFullList({
			// provisioning_error != "" is deliberately excluded here, not
			// retried automatically — see provisioning.js for why a bare
			// retry risks duplicate Chatwoot accounts/OpenRouter keys.
			filter: 'whatsapp_connected = false && whatsapp_number_e164 != "" && provisioning_error = ""',
		});
	} catch (error) {
		logger.error(`whatsapp-poll: failed to load pending subscriptions: ${error.message}`);
		return;
	}

	if (pending.length === 0) {
		return;
	}

	const { ok: clientsOk, body: clientsBody } = await graphGet(`${BUSINESS_ID}/client_whatsapp_business_accounts`, token);
	if (!clientsOk) {
		logger.error(`whatsapp-poll: client_whatsapp_business_accounts failed: ${JSON.stringify(clientsBody)}`);
		return;
	}

	for (const waba of clientsBody.data || []) {
		const { ok: phonesOk, body: phonesBody } = await graphGet(`${waba.id}/phone_numbers`, token);
		if (!phonesOk) {
			continue;
		}

		for (const phoneEntry of phonesBody.data || []) {
			const displayNumber = normalizePhone(phoneEntry.display_phone_number);
			const match = pending.find((sub) => normalizePhone(sub.whatsapp_number_e164) === displayNumber);
			if (!match) {
				continue;
			}

			const { ok: regOk, body: regBody } = await graphPost(
				`${phoneEntry.id}/register`,
				{ messaging_product: 'whatsapp', pin: generatePin() },
				token,
			);
			if (!regOk) {
				logger.warn(`whatsapp-poll: register failed for subscription ${match.id}: ${JSON.stringify(regBody)}`);
				continue;
			}

			const { ok: subOk, body: subBody } = await graphPost(`${waba.id}/subscribed_apps`, {}, token);
			if (!subOk) {
				logger.warn(`whatsapp-poll: subscribed_apps failed for WABA ${waba.id}: ${JSON.stringify(subBody)}`);
			}

			// whatsapp_connected is set INSIDE provisionCustomer, only once the
			// full Chatwoot/OpenRouter/n8n chain succeeds — not here — so a
			// partial failure doesn't leave the subscription looking "done"
			// while actually having no working Agent behind it.
			try {
				await provisionCustomer(match, waba.id);
			} catch (error) {
				logger.error(`whatsapp-poll: provisioning failed for subscription ${match.id}: ${error.message}`);
				try {
					await pb.collection('subscriptions').update(match.id, { provisioning_error: error.message.slice(0, 2000) });
				} catch (updateError) {
					logger.error(`whatsapp-poll: failed to record provisioning error for ${match.id}: ${updateError.message}`);
				}
			}
		}
	}
};
