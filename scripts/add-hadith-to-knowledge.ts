import { pipeline } from "@huggingface/transformers";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Loading embedding model...");

  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  console.log("Connecting to MongoDB...");

  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();

  const db = client.db("halalwise");

  // Find Hadith #2
  const hadith = await db.collection("hadith").findOne({
    collection: "Sahih al-Bukhari",
    hadithNumber: 2,
    verified: true,
  });

  if (!hadith) {
    throw new Error("Verified Hadith #2 was not found.");
  }

  console.log("Found:", hadith.reference);

  // Make sure the linked source is verified
  const source = await db.collection("sources").findOne({
    _id: hadith.sourceId,
    verified: true,
  });

  if (!source) {
    throw new Error(
      "Hadith source was not found or is not verified."
    );
  }

  console.log("Verified source:", source.sourceName);

  // Check whether knowledge record already exists
  const existing = await db.collection("knowledge").findOne({
    sourceId: hadith.sourceId,
    reference: hadith.reference,
  });

  if (existing) {
    console.log("Knowledge record already exists.");
    await client.close();
    return;
  }

  // Create searchable knowledge content
  const content =
    hadith.translation?.text ||
    hadith.arabicText ||
    "";

  console.log("Creating embedding...");

  const output = await extractor(content, {
    pooling: "mean",
    normalize: true,
  });

  const embedding = Array.from(output.data);

  console.log(
    "Embedding dimensions:",
    embedding.length
  );

  // Create knowledge record
  const knowledge = {
    title: "Hadith on Divine Revelation",
    topic: "Revelation",
    content,

    sourceId: hadith.sourceId,
    sourceType: source.sourceType,
    sourceName: source.sourceName,
    reference: hadith.reference,

    originalText: hadith.arabicText,

    translation: hadith.translation,

    authorityLevel: source.authorityLevel,
    authenticity: hadith.authenticity?.grade || source.authenticity,

    madhhab: source.madhhab,

    methodology:
      hadith.authenticity?.methodology ||
      source.methodology,

    verified: true,
    verifiedBy: "HalalWise source verification",
    verifiedAt: hadith.verifiedAt,

    embedding,

    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db
    .collection("knowledge")
    .insertOne(knowledge);

  console.log("");
  console.log("SUCCESS");
  console.log("Knowledge ID:", result.insertedId);
  console.log(
    "Embedding dimensions:",
    embedding.length
  );
  console.log("Knowledge record created successfully.");

  await client.close();
}

main().catch((error) => {
  console.error("ERROR:", error);
  process.exit(1);
});