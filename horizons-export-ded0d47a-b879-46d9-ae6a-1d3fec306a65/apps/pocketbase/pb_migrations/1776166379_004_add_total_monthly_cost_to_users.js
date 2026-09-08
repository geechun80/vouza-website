/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  const existing = collection.fields.getByName("total_monthly_cost");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("total_monthly_cost"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "total_monthly_cost"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("users");
  collection.fields.removeByName("total_monthly_cost");
  return app.save(collection);
})