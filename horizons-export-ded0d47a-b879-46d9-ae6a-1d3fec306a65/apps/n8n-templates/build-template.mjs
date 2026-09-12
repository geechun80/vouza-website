// Builds the per-customer n8n workflow TEMPLATE from the live demo bot's
// export (vouza_workflow_full.json, pulled from the actual DB this
// session), leaving the original workflow completely untouched. Produces
// template.json: still has __PLACEHOLDER__ tokens for the values that
// differ per customer — clone-time code does the final substitution per
// subscriber, and creates a brand new n8n workflow from the result.
import fs from 'node:fs';

const raw = JSON.parse(fs.readFileSync('./vouza_workflow_full.json', 'utf8'));
const nodes = structuredClone(raw.nodes);
const connections = structuredClone(raw.connections);

const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

// --- 0. Webhook trigger path must be unique per workflow — n8n refuses to
// activate a second workflow whose webhook path collides with an already-
// active one (hit this for real testing the first clone: "There is a
// conflict with one of the webhooks").
byId['wh-chatwoot'].parameters.path = '__WEBHOOK_PATH__';

// --- 1. Chatwoot account id + auth token on the 5 nodes confirmed earlier
// to have them hardcoded (see project memory). The same shared
// service-user token works for every clone (it's added as administrator on
// every new account), so it's still a placeholder resolved from env at
// clone time, not something unique per customer.
const CW_HTTP_NODE_IDS = [
	'http-send-handoff-ack',
	'http-send-welcome-menu-cw',
	'http-send-cw-voice',
	'http-send-cw-text',
	'http-assign-human-cw',
];
for (const id of CW_HTTP_NODE_IDS) {
	const n = byId[id];
	n.parameters.url = n.parameters.url.replace('accounts/2', 'accounts/__CHATWOOT_ACCOUNT_ID__');
	const tokenParam = n.parameters.headerParameters.parameters.find((p) => p.name === 'api_access_token');
	if (tokenParam) tokenParam.value = '__CHATWOOT_API_TOKEN__';
}

// --- 2. Handoff assignee: was Vouza's own owner (id 2) — for a clone this
// must be the customer's own Chatwoot user id, or handoff assigns to nobody
// that exists in their account.
byId['http-assign-human-cw'].parameters.jsonBody =
	'={{ JSON.stringify({ assignee_id: __CHATWOOT_CUSTOMER_USER_ID__ }) }}';

// --- 3. Per-customer memory files, isolated by subscription so two end
// customers who happen to message two different Vouza clients never
// collide in the same file (memoryKey is keyed by the END CUSTOMER's own
// phone number, which isn't unique per business).
byId['file-read-customer-memory'].parameters.fileSelector = byId['file-read-customer-memory'].parameters.fileSelector.replace(
	'/customer-memory/',
	'/customer-memory/__SUBSCRIPTION_ID__/',
);
byId['file-write-customer-memory'].parameters.fileName = byId['file-write-customer-memory'].parameters.fileName.replace(
	'/customer-memory/',
	'/customer-memory/__SUBSCRIPTION_ID__/',
);

// --- 4. Idle-conversation summary email goes to the customer, not Vouza.
// fromEmail stays as-is — the verified sending address on the existing
// SMTP credential, which every clone can reuse to notify a different
// toEmail.
byId['gmail-notify-cw'].parameters.toEmail = '__CUSTOMER_EMAIL__';

// --- 5. System prompt: every generic rule (verified-info-only, memory
// handling, conversation style, language detection, JSON output schema)
// carried over verbatim from the working original — only the
// business-identity parts change. The CCTV-pinning clause was a
// Vouza-specific product decision, not a generic rule, so it's dropped
// for clones rather than parameterized.
const SYSTEM_PROMPT = "You are the WhatsApp customer service assistant for __BUSINESS_NAME__. Only answer using the verified information about __BUSINESS_NAME__ below, do not invent, guess, or assume any feature, product, or pricing that is not listed here. VERIFIED __BUSINESS_NAME__ INFO: __BUSINESS_INFO_BLOCK__ RULES: Only answer questions about __BUSINESS_NAME__'s products, services, pricing, support, or onboarding, using ONLY the verified info above. If unsure whether something is offered, say you will confirm with the team rather than guessing. If a customer asks about anything clearly unrelated to __BUSINESS_NAME__ such as weather or general trivia, politely decline and redirect back to relevant topics. If the customer explicitly asks to speak to a human, a real person, or the business owner, set wants_human to true and tell them a team member will follow up with them directly. MEMORY: You may receive notes about this customer from earlier conversations as a separate system message. The name and facts in those notes belong to the CUSTOMER you are talking to, never to you the assistant. Greet them in the second person using their name, for example Hi GeeChun, welcome back!, never say I am followed by their name and never phrase it as asking them to confirm their own name unless it is genuinely ambiguous. Use the notes naturally to personalize your reply, such as greeting a returning customer by name or referring back to something relevant they mentioned before, but never quote the notes verbatim or make it obvious you are reading from a file. If told this is a new customer, do not pretend to already know them. If the customer states or confirms their name, or shares a short durable fact worth remembering for future conversations (such as their company, industry, or a stated interest), capture it using the customer_name and new_fact fields described below; otherwise leave those fields null. CONVERSATION STYLE: Act like an engaged, friendly human sales and support agent chatting on WhatsApp, not a static FAQ lookup or brochure. Never dump the full catalog of services in one message, even when the customer asks a broad question like what do you offer or tell me about your products. For a broad question, name at most 3 short, likely-relevant things by title only, a few words each with no descriptions, then immediately ask a short question to find out what they actually need before saying more. Only go into detail about a specific product or service once the customer has named or picked one. If you do need to mention more than one item in a single reply, list at most 3, put each on its own line starting with a dash, keep each line under 10 words, and never combine more than one item into a single sentence of prose. Keep the entire reply, including any short list and the follow-up question, to no more than 4 short lines total. Never write a long paragraph. Always end with one short, natural follow-up question or next step relevant to what the customer just asked, unless the customer explicitly asked to speak to a human. Keep language casual and warm, like a real WhatsApp chat, not a formal document, since replies may also be converted to speech and long messages sound unnatural and can fail to generate as voice notes. Overall tone: __BUSINESS_TONE__. If the customer's message is vague or a greeting, skip any listing entirely and just ask a short clarifying question about what they are looking for. LANGUAGE: Detect which language the customer is writing or speaking in. You support English, Chinese (Mandarin), and Malay. Always reply in the SAME language the customer used. If the customer mixes languages or it is unclear, default to English. Set the language field to exactly one of: \\\"en\\\", \\\"zh\\\", \\\"ms\\\". The reply text and the language field MUST always match exactly, never write the reply in a different language than the one stated in the language field, and never mix two languages within the reply. Always respond with ONLY a JSON object in this exact shape: {\\\"reply\\\": \\\"<message to send to the customer, written in the detected language>\\\", \\\"wants_human\\\": <true or false>, \\\"summary\\\": \\\"<one sentence summary in English of what the customer asked and how you responded>\\\", \\\"language\\\": \\\"<en, zh, or ms>\\\", \\\"customer_name\\\": <the customer's name as a string if stated or confirmed in this message, otherwise null>, \\\"new_fact\\\": <one short durable fact as a string worth remembering about this customer for future conversations, otherwise null>}";

const MEMORY_SYSTEM_MSG = '($json.isNewCustomer ? "This is a NEW customer with no notes from prior conversations yet." : "Notes about this RETURNING customer from previous conversations:\\n" + $json.memoryText)';

const buildMessagesExpr = (model) =>
	`={{ JSON.stringify({ model: "${model}", max_tokens: 500, response_format: { type: "json_object" }, messages: [{ role: "system", content: "${SYSTEM_PROMPT}" }, { role: "system", content: ${MEMORY_SYSTEM_MSG} }].concat($json.historyMessages || [], [{ role: "user", content: $json.text }]) }) }}`;

byId['http-claude-cw'].parameters.jsonBody = buildMessagesExpr('nvidia/nemotron-3.5-lightning');
byId['http-claude-cw'].name = 'Text AI Response (CW)'; // clarify now that there are two branches

// --- 6. Image routing: mirror the existing audio-detection pattern in
// "Extract Chatwoot Message" (already extracts attachments — this just
// adds the same handling for file_type === 'image'), a new IF node exactly
// like "Has Voice Attachment?", and a new HTTP node sending the SAME
// conversation context but to gemini-2.5-flash with the image URL attached
// — Chatwoot's attachment data_url is already a real public HTTPS URL (the
// same one "Download Chatwoot Audio" fetches from), so it can be passed
// straight to OpenRouter's multimodal messages format with no download step.
byId['code-extract-cw'].parameters.jsCode = byId['code-extract-cw'].parameters.jsCode.replace(
	"const audioAttachment = attachments.find(function(a) { return a.file_type === 'audio'; });",
	"const audioAttachment = attachments.find(function(a) { return a.file_type === 'audio'; });\nconst imageAttachment = attachments.find(function(a) { return a.file_type === 'image'; });",
).replace(
	'audioUrl: audioAttachment ? audioAttachment.data_url : null',
	'audioUrl: audioAttachment ? audioAttachment.data_url : null,\n    hasImage: imageAttachment ? \'true\' : \'false\',\n    imageUrl: imageAttachment ? imageAttachment.data_url : null',
);

const hasImageIfNode = {
	parameters: {
		conditions: {
			string: [{ value1: '={{ $json.hasImage }}', value2: 'true' }],
		},
	},
	id: 'if-cw-image-in',
	name: 'Has Image Attachment?',
	type: 'n8n-nodes-base.if',
	typeVersion: 1,
	position: [byId['http-claude-cw'].position[0] - 120, byId['http-claude-cw'].position[1] - 80],
};

const visionResponseNode = {
	parameters: {
		authentication: 'predefinedCredentialType',
		nodeCredentialType: 'httpHeaderAuth',
		method: 'POST',
		url: 'https://openrouter.ai/api/v1/chat/completions',
		sendHeaders: true,
		headerParameters: { parameters: [{ name: 'content-type', value: 'application/json' }] },
		sendBody: true,
		specifyBody: 'json',
		jsonBody:
			`={{ JSON.stringify({ model: "google/gemini-2.5-flash", max_tokens: 500, response_format: { type: "json_object" }, messages: [{ role: "system", content: "${SYSTEM_PROMPT}" }, { role: "system", content: ${MEMORY_SYSTEM_MSG} }].concat($json.historyMessages || [], [{ role: "user", content: [{ type: "text", text: $json.text || "What is in this image?" }, { type: "image_url", image_url: { url: $json.imageUrl } }] }]) }) }}`,
		options: {},
	},
	id: 'http-gemini-vision-cw',
	name: 'Vision AI Response (CW)',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	position: [byId['http-claude-cw'].position[0], byId['http-claude-cw'].position[1] - 80],
	credentials: { httpHeaderAuth: { id: '__OPENROUTER_CREDENTIAL_ID__', name: '__OPENROUTER_CREDENTIAL_NAME__' } },
};

nodes.push(hasImageIfNode, visionResponseNode);
byId['http-claude-cw'].credentials = { httpHeaderAuth: { id: '__OPENROUTER_CREDENTIAL_ID__', name: '__OPENROUTER_CREDENTIAL_NAME__' } };

// Rewire: Is First Contact? (false branch) -> Has Image Attachment? ->
// [true: Vision AI Response, false: Text AI Response] -> both already flow
// into Format Reply (CW) via the existing edge for the text node, add the
// same edge for the new vision node.
connections['Is First Contact?'].main[1] = [{ node: 'Has Image Attachment?', type: 'main', index: 0 }];
connections['Has Image Attachment?'] = {
	main: [
		[{ node: 'Vision AI Response (CW)', type: 'main', index: 0 }],
		[{ node: 'Text AI Response (CW)', type: 'main', index: 0 }],
	],
};
connections['Vision AI Response (CW)'] = { main: [[{ node: 'Format Reply (CW)', type: 'main', index: 0 }]] };
// The old key "OpenRouter AI Response (CW)" was renamed to "Text AI Response
// (CW)" above — carry its existing outgoing connection over to the new name.
connections['Text AI Response (CW)'] = connections['OpenRouter AI Response (CW)'];
delete connections['OpenRouter AI Response (CW)'];

const template = {
	name: '__WORKFLOW_NAME__',
	nodes,
	connections,
	settings: raw.settings ? JSON.parse(raw.settings) : {},
};

fs.writeFileSync('./template.json', JSON.stringify(template, null, 2));
console.log('template written, nodes:', nodes.length);
console.log('placeholders present:', [...new Set(JSON.stringify(template).match(/__[A-Z_]+__/g))]);
