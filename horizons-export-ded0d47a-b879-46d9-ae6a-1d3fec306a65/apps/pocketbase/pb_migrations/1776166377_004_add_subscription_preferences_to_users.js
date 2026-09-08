/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  const existing = collection.fields.getByName("subscription_preferences");
  if (existing) {
    if (existing.type === "json") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("subscription_preferences"); // exists with wrong type, remove first
  }

  collection.fields.add(new JSONField({
    name: "subscription_preferences"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("subscription_preferences");
  return app.save(collection);
})