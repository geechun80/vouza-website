/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_5713991167")

  // add field
  collection.fields.addAt(16, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text246971403",
    "max": 120,
    "min": 0,
    "name": "business_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(17, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text740333902",
    "max": 1000,
    "min": 0,
    "name": "business_description",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(18, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1616803627",
    "max": 4000,
    "min": 0,
    "name": "business_key_facts",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(19, new Field({
    "hidden": false,
    "id": "select279950649",
    "maxSelect": 1,
    "name": "business_tone",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "friendly",
      "professional",
      "casual"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_5713991167")

  // remove field
  collection.fields.removeById("text246971403")

  // remove field
  collection.fields.removeById("text740333902")

  // remove field
  collection.fields.removeById("text1616803627")

  // remove field
  collection.fields.removeById("select279950649")

  return app.save(collection)
})
