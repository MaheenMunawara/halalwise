import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Please add MONGODB_URI to .env.local");
}

const options = {
  serverSelectionTimeoutMS: 10000,
};

const client = new MongoClient(uri, options);

let clientPromise = client.connect();

export default clientPromise;