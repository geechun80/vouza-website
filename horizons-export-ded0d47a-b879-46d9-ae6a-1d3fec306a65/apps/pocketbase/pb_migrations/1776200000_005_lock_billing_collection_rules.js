/// <reference path="../pb_data/types.d.ts" />
// Fix 1: subscriptions/invoices were createRule "@request.auth.id != ''" and
// updateRule/deleteRule "user_id = @request.auth.id" — any logged-in user
// could create an "active" subscription record from the browser console
// without paying, or flip a cancelled one back to active. Only the Express
// API (which authenticates as PocketBase superuser and bypasses rules
// entirely) should ever write these collections, so lock create/update/delete
// to superuser-only (null rule). listRule/viewRule stay as-is so users can
// still read their own records.
//
// Fix 2: users.updateRule "id = @request.auth.id" had no field restriction,
// so a user could set stripe_customer_id to someone else's cus_... id and
// then read that customer's invoices / bill their card via the API. Block
// those three billing-derived fields from being present in a self-update
// request body; subscription_preferences stays user-editable.
migrate((app) => {
  const subscriptions = app.findCollectionByNameOrId("subscriptions");
  subscriptions.createRule = null;
  subscriptions.updateRule = null;
  subscriptions.deleteRule = null;
  app.save(subscriptions);

  const invoices = app.findCollectionByNameOrId("invoices");
  invoices.createRule = null;
  invoices.updateRule = null;
  invoices.deleteRule = null;
  app.save(invoices);

  const users = app.findCollectionByNameOrId("users");
  users.updateRule = "id = @request.auth.id && @request.body.stripe_customer_id:isset = false && @request.body.total_monthly_cost:isset = false && @request.body.last_billing_date:isset = false";
  app.save(users);
}, (app) => {
  const subscriptions = app.findCollectionByNameOrId("subscriptions");
  subscriptions.createRule = "@request.auth.id != ''";
  subscriptions.updateRule = "user_id = @request.auth.id";
  subscriptions.deleteRule = "user_id = @request.auth.id";
  app.save(subscriptions);

  const invoices = app.findCollectionByNameOrId("invoices");
  invoices.createRule = "@request.auth.id != ''";
  invoices.updateRule = "user_id = @request.auth.id";
  invoices.deleteRule = "user_id = @request.auth.id";
  app.save(invoices);

  const users = app.findCollectionByNameOrId("users");
  users.updateRule = "id = @request.auth.id";
  app.save(users);
})
