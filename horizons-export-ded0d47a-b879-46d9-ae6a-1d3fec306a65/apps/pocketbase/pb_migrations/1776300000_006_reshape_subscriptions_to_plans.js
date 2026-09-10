/// <reference path="../pb_data/types.d.ts" />
// The product moved from per-character subscriptions to WhatsApp AI sold in
// three plans (Basic/Advanced/Premium). `subscriptions` and `invoices` were
// both empty at the time this was written, so character_id is replaced
// outright rather than backfilled. The `ai_characters` collection and its rows
// are deliberately left untouched — just unused from here on.
migrate((app) => {
  const subscriptions = app.findCollectionByNameOrId("subscriptions");

  if (subscriptions.fields.getByName("character_id")) {
    subscriptions.fields.removeByName("character_id");
  }

  if (!subscriptions.fields.getByName("plan")) {
    subscriptions.fields.add(new SelectField({
      name: "plan",
      required: true,
      maxSelect: 1,
      values: ["basic", "advanced", "premium"],
    }));
  }

  // Annual billing (10% off) reuses the same monthly Prices' plan tiers, just
  // billed on a different Stripe Price/interval — this field is what lets
  // the dashboard and the webhook tell which one a given subscription is on.
  if (!subscriptions.fields.getByName("billing_interval")) {
    subscriptions.fields.add(new SelectField({
      name: "billing_interval",
      required: true,
      maxSelect: 1,
      values: ["monthly", "annual"],
    }));
  }

  // Flipped to true by the Meta Embedded Signup flow once a WhatsApp number is
  // linked to this Agent. Nothing writes it yet; the field exists so that page
  // has somewhere to land. Bool fields are false when unset in PocketBase, so
  // there is no separate default to declare.
  if (!subscriptions.fields.getByName("whatsapp_connected")) {
    subscriptions.fields.add(new BoolField({
      name: "whatsapp_connected",
    }));
  }

  // monthly_cost alone is ambiguous: the Price object's own unit_amount is
  // fixed to its default currency (sgd) regardless of which currency a given
  // Checkout Session actually billed in, so the number stored here needs its
  // currency alongside it to mean anything.
  if (!subscriptions.fields.getByName("currency")) {
    subscriptions.fields.add(new TextField({
      name: "currency",
      required: true,
    }));
  }

  // invoice.payment_failed needs a status to write; the original select only
  // allowed active/paused/cancelled and PocketBase rejects any other value.
  // Assigned as a plain literal rather than derived from the existing slice:
  // `values` is a Go []string behind the JSVM proxy, so JS array methods on it
  // are not dependable.
  const status = subscriptions.fields.getByName("status");
  if (status) {
    status.values = ["active", "paused", "past_due", "cancelled"];
  }

  app.save(subscriptions);

  // Section 15 of the pricing policy requires message usage to be tracked
  // independently of Stripe billing. This is the log side of that only — no
  // metering or consumption logic exists yet.
  const topups = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3901254678",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "text7104582293",
        "name": "user_id",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text",
        "autogeneratePattern": "",
        "max": 0,
        "min": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "id": "select4471039825",
        "name": "plan",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "select",
        "maxSelect": 1,
        "values": [
          "basic",
          "advanced",
          "premium"
        ]
      },
      {
        "hidden": false,
        "id": "number2295810467",
        "name": "messages",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "number",
        "max": null,
        "min": null,
        "onlyInt": true
      },
      {
        "hidden": false,
        "id": "number8663017249",
        "name": "amount",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "number",
        "max": null,
        "min": null,
        "onlyInt": false
      },
      {
        "hidden": false,
        "id": "text5528830146",
        "name": "currency",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text",
        "autogeneratePattern": "",
        "max": 0,
        "min": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "id": "text9037461582",
        "name": "stripe_checkout_session_id",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text",
        "autogeneratePattern": "",
        "max": 0,
        "min": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "id": "date6182904735",
        "name": "purchased_at",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "date",
        "max": "",
        "min": ""
      },
      {
        "hidden": false,
        "id": "autodate7350194628",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate1908375426",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_7742019365",
    "indexes": [],
    // Same lockdown as subscriptions/invoices (migration 005): users read their
    // own rows, only the Express API (superuser, rules bypassed) may write.
    "listRule": "user_id = @request.auth.id",
    "name": "topups",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": "user_id = @request.auth.id"
  });

  try {
    return app.save(topups);
  } catch (e) {
    if (e.message.includes("Collection name must be unique")) {
      console.log("Collection already exists, skipping");
      return;
    }
    throw e;
  }
}, (app) => {
  try {
    const topups = app.findCollectionByNameOrId("pbc_7742019365");
    app.delete(topups);
  } catch (e) {
    if (!e.message.includes("no rows in result set")) {
      throw e;
    }
    console.log("Collection not found, skipping revert");
  }

  const subscriptions = app.findCollectionByNameOrId("subscriptions");

  if (subscriptions.fields.getByName("plan")) {
    subscriptions.fields.removeByName("plan");
  }

  if (subscriptions.fields.getByName("billing_interval")) {
    subscriptions.fields.removeByName("billing_interval");
  }

  if (subscriptions.fields.getByName("whatsapp_connected")) {
    subscriptions.fields.removeByName("whatsapp_connected");
  }

  if (subscriptions.fields.getByName("currency")) {
    subscriptions.fields.removeByName("currency");
  }

  if (!subscriptions.fields.getByName("character_id")) {
    subscriptions.fields.add(new TextField({
      name: "character_id",
      required: true,
    }));
  }

  const status = subscriptions.fields.getByName("status");
  if (status) {
    status.values = ["active", "paused", "cancelled"];
  }

  return app.save(subscriptions);
})
