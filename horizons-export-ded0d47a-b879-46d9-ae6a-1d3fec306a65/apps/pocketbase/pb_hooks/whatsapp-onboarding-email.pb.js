/// <reference path="../pb_data/types.d.ts" />

// Fires once per subscription record (one WhatsApp Agent = one subscription =
// one WhatsApp number to connect), not gated to "first subscription only" —
// unlike the setup fee, onboarding is per-Agent since each Agent needs its
// own number connected.
//
// Basic/Advanced: Vouza is already an approved Meta Tech Provider, so these
// plans self-serve via Meta's Zero Integration Onboarding — no website build
// needed on our side, Meta hosts the whole flow.
// Premium: routes through Twilio instead (not self-serve yet), so this plan
// gets a different email pointing to manual/white-glove setup rather than
// the Meta link.
//
// Phase 1 of the onboarding automation: only sends the email. What happens
// after the customer completes Meta's flow (registering the number for
// Cloud API, subscribing the WABA to webhooks, provisioning an isolated
// Chatwoot account + inbox, and connecting the AI agent) is not yet
// automated — see project memory for the full phased plan.
onRecordAfterCreateSuccess((e) => {
    const plan = e.record.get("plan");
    const userId = e.record.get("user_id");

    let user;
    try {
        user = e.app.findRecordById("users", userId);
    } catch (err) {
        console.error(`whatsapp-onboarding-email: no user ${userId} for subscription ${e.record.id}`, err);
        e.next();
        return;
    }

    const email = user.get("email");
    const senderAddress = e.app.settings().meta.senderAddress;
    const senderName = e.app.settings().meta.senderName;

    const ZERO_INTEGRATION_URL =
        "https://business.facebook.com/messaging/whatsapp/onboard/?app_id=1358134533194597&config_id=4509495119264313";

    let subject;
    let html;

    if (plan === "premium") {
        subject = "Next step: connecting your WhatsApp number to Vouza AI";
        html = [
            "<p>Hi,</p>",
            "<p>Thanks for subscribing to the Premium WhatsApp AI Agent plan.</p>",
            "<p>Premium connects through Twilio for extra capabilities (like voice calling), so a member of our team will reach out shortly by email to walk you through connecting your WhatsApp Business number — no action is needed from you right now.</p>",
            "<p>If you'd like to get started sooner, feel free to reply to this email.</p>",
            "<p>Thanks,<br/>The Vouza AI team</p>",
        ].join("\n");
    } else {
        subject = "Next step: connect your WhatsApp number to Vouza AI";
        html = [
            "<p>Hi,</p>",
            "<p>Thanks for subscribing to Vouza AI! One step left before your AI Agent can start replying on WhatsApp: connecting your WhatsApp Business number.</p>",
            "<p>",
            `  <a href="${ZERO_INTEGRATION_URL}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 24px;background:#0074d4;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Connect your WhatsApp number</a>`,
            "</p>",
            "<p><strong>What to expect:</strong></p>",
            "<ol>",
            "  <li>Click the button above and log in with the Facebook account that manages your business (or create one — it's free).</li>",
            "  <li>Select or create your Business Portfolio in Meta Business Manager.</li>",
            "  <li>Choose the WhatsApp number you want your AI Agent to use — either a new number or one you already use for WhatsApp Business.</li>",
            "  <li>Verify the number with the code Meta sends you.</li>",
            "  <li>Confirm access — this is what lets Vouza's backend send and receive messages on your Agent's behalf. Vouza never sees your other Facebook/Business data.</li>",
            "</ol>",
            "<p>Once you've completed these steps, our system will detect it and finish setting up your AI Agent — we'll follow up by email once it's live and ready to chat.</p>",
            "<p><i>Note: if the number you choose is already used with the regular WhatsApp Business app or WhatsApp Web, it will move to our AI-powered platform and can no longer be used in those apps directly — you and your team will manage conversations through Vouza's dashboard instead.</i></p>",
            "<p>",
            "  Thanks,<br/>",
            "  The Vouza AI team",
            "</p>",
        ].join("\n");
    }

    const message = new MailerMessage({
        from: { address: senderAddress, name: senderName },
        to: [{ address: email }],
        subject: subject,
        html: html,
    });

    try {
        e.app.newMailClient().send(message);
    } catch (err) {
        console.error(`whatsapp-onboarding-email: failed to send to ${email}`, err);
    }

    e.next();
}, "subscriptions");
