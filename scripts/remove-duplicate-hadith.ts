import dotenv from "dotenv";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing from .env.local");
}

const client = new MongoClient(uri);

async function main() {
  await client.connect();

  const db = client.db("halalwise");
  const knowledge = db.collection("knowledge");

  const duplicateId = new ObjectId(
    "6aa00f6f30d2b75acb9ea507"
  );

  const duplicate = await knowledge.findOne({
    _id: duplicateId,
  });

  if (!duplicate) {
    throw new Error(
      "The expected duplicate document was not found. Nothing was deleted."
    );
  }

  const isExpectedDuplicate =
    duplicate.category === "hadith" &&
    duplicate.collection === "Sahih al-Bukhari" &&
    duplicate.hadithNumber === 1 &&
    duplicate.reference === "Sahih al-Bukhari 1" &&
    duplicate.verified === true;

  if (!isExpectedDuplicate) {
    throw new Error(
      "The document does not match the expected duplicate conditions. Nothing was deleted."
    );
  }

  console.log("Confirmed duplicate:");
  console.log({
    id: String(duplicate._id),
    title: duplicate.title,
    category: duplicate.category,
    collection: duplicate.collection,
    hadithNumber: duplicate.hadithNumber,
    reference: duplicate.reference,
    verified: duplicate.verified,
  });

  console.log("");
  console.log("Deleting exactly this duplicate...");

  const result = await knowledge.deleteOne({
    _id: duplicateId,
  });

  if (result.deletedCount !== 1) {
    throw new Error(
      "Expected exactly one document to be deleted."
    );
  }

  console.log("");
  console.log("✓ Duplicate Hadith removed.");
  console.log("✓ No other knowledge documents were deleted.");
}

main()
  .catch((error) => {
    console.error("Duplicate removal failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await client.close();
  });