/// <reference path="../pb_data/types.d.ts" />

// Fires whenever a subscription record is updated and has just become
// fully_provisioned — the Express API's provisioning.js sets that flag in
// the same write as all the Chatwoot/n8n fields once the whole chain
// (account, inbox, agent bot, OpenRouter key, cloned workflow) succeeds.
// Guarded by ready_email_sent so a later unrelated update to the same
// record (e.g. status changes) never re-sends this.
onRecordAfterUpdateSuccess((e) => {
    if (!e.record.get("fully_provisioned") || e.record.get("ready_email_sent")) {
        e.next();
        return;
    }

    const userId = e.record.get("user_id");
    let user;
    try {
        user = e.app.findRecordById("users", userId);
    } catch (err) {
        console.error(`whatsapp-ready-email: no user ${userId} for subscription ${e.record.id}`, err);
        e.next();
        return;
    }

    const email = user.get("email");
    const senderAddress = e.app.settings().meta.senderAddress;
    const senderName = e.app.settings().meta.senderName;

    const firstName = (user.get("name") || "").trim().split(/\s+/)[0] || "";
    const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";

    const ssoUrl = e.record.get("chatwoot_sso_url");
    const businessName = e.record.get("business_name") || "your business";

    const subject = "Your Vouza AI Agent is live!";
    const html = [
        `<p>${greeting}</p>`,
        `<p>Good news — your WhatsApp AI Agent for <strong>${escapeHtml(businessName)}</strong> is connected and replying to customers.</p>`,
        "<p>",
        `  <a href="${ssoUrl}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 24px;background:#0074d4;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Open your inbox</a>`,
        "</p>",
        "<p>This takes you straight into your own private dashboard at inbox.vouza.ai — no password needed. From there you can:</p>",
        "<ul>",
        "  <li>Watch your Agent reply to customers in real time</li>",
        "  <li>Jump into any conversation and take over yourself whenever you want</li>",
        "  <li>See a full history of every chat</li>",
        "</ul>",
        "<p><i>This link signs you in directly — don't forward this email to anyone you don't want accessing your inbox.</i></p>",
        "<p>",
        "  Thanks,<br/>",
        "  The Vouza AI team",
        "</p>",
    ].join("\n");

    const message = new MailerMessage({
        from: { address: senderAddress, name: senderName },
        to: [{ address: email }],
        subject: subject,
        html: html,
    });

    try {
        e.app.newMailClient().send(message);
        e.record.set("ready_email_sent", true);
        e.app.save(e.record);
    } catch (err) {
        console.error(`whatsapp-ready-email: failed to send to ${email}`, err);
    }

    e.next();
}, "subscriptions");
