/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_5713991167")

  // add field
  collection.fields.addAt(20, new Field({
    "hidden": false,
    "id": "number3340801490",
    "max": null,
    "min": null,
    "name": "chatwoot_account_id",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(21, new Field({
    "hidden": false,
    "id": "number2990778665",
    "max": null,
    "min": null,
    "name": "chatwoot_user_id",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(22, new Field({
    "hidden": false,
    "id": "number3659029248",
    "max": null,
    "min": null,
    "name": "chatwoot_inbox_id",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(23, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text487623222",
    "max": 60,
    "min": 0,
    "name": "n8n_workflow_id",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(24, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text498480101",
    "max": 80,
    "min": 0,
    "name": "openrouter_key_hash",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(25, new Field({
    "hidden": false,
    "id": "bool4227118891",
    "name": "fully_provisioned",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(26, new Field({
    "hidden": false,
    "id": "bool2390820877",
    "name": "ready_email_sent",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(27, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1531737039",
    "max": 500,
    "min": 0,
    "name": "chatwoot_sso_url",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_5713991167")

  // remove field
  collection.fields.removeById("number3340801490")

  // remove field
  collection.fields.removeById("number2990778665")

  // remove field
  collection.fields.removeById("number3659029248")

  // remove field
  collection.fields.removeById("text487623222")

  // remove field
  collection.fields.removeById("text498480101")

  // remove field
  collection.fields.removeById("bool4227118891")

  // remove field
  collection.fields.removeById("bool2390820877")

  // remove field
  collection.fields.removeById("text1531737039")

  return app.save(collection)
})
