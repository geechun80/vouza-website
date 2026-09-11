/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "updateRule": "id = @request.auth.id && @request.body.stripe_customer_id:isset = false && @request.body.total_monthly_cost:isset = false && @request.body.last_billing_date:isset = false && @request.body.totp_secret:isset = false && @request.body.totp_enabled:isset = false"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "updateRule": "id = @request.auth.id && @request.body.stripe_customer_id:isset = false && @request.body.total_monthly_cost:isset = false && @request.body.last_billing_date:isset = false"
  }, collection)

  return app.save(collection)
})
