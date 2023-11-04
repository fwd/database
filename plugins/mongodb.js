const { MongoClient, ObjectId } = require('mongodb');

module.exports = async (config) => {

  const url = config.url; // MongoDB connection URL

  const client = new MongoClient(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();

  const db = client.db();

  return {
    list(model) {
      return db.collection(model).find().toArray();
    },
    get(model, id) {
      return db.collection(model).findOne({ _id: ObjectId(id) });
    },
    findFirst(model, query) {
      return db.collection(model).findOne(query);
    },
    findLast(model, query) {
      return db.collection(model).findOne(query, { sort: { _id: -1 } });
    },
    findOne(model, query) {
      return db.collection(model).findOne(query);
    },
    paginate(model, query) {
      // You may need to implement pagination logic here using query.skip() and query.limit()
      return db.collection(model).find(query).toArray();
    },
    find(model, query) {
      return db.collection(model).find(query).toArray();
    },
    create(model, value) {
      return db.collection(model).insertOne(value);
    },
    update(model, id, update) {
      return db.collection(model).updateOne({ _id: ObjectId(id) }, { $set: update });
    },
    set(model, value) {
      // Implement the logic for setting a value in a document
      return null;
    },
    remove(model, id) {
      return db.collection(model).deleteOne({ _id: ObjectId(id) });
    },
  };
};
