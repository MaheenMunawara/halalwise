import { pipeline } from "@huggingface/transformers";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const hadithNumber = Number(process.argv[2]);

  if (!hadithNumber) {
    throw new Error(
      "Please provide a Hadith number. Example: npx tsx scripts/ingest-hadith.ts 2"
    );
  }

  console.log(`Starting ingestion for Sahih al-Bukhari ${hadithNumber}...`);

  console.log("Connecting to MongoDB...");

  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();

  const db = client.db("halalwise");

  // --------------------------------------------------
  // 1. Find verified Hadith
  // --------------------------------------------------

  const hadith = await db.collection("hadith").findOne({
    collection: "Sahih al-Bukhari",
    hadithNumber,
    verified: true,
  });

  if (!hadith) {
    throw new Error(
      `Verified Sahih al-Bukhari ${hadithNumber} was not found.`
    );
  }

  console.log(`✓ Found: ${hadith.reference}`);

  // --------------------------------------------------
  // 2. Verify linked source
  // --------------------------------------------------

  const source = await db.collection("sources").findOne({
    _id: hadith.sourceId,
    verified: true,
  });

  if (!source) {
    throw new Error(
      `Verified source for ${hadith.reference} was not found.`
    );
  }

  console.log(`✓ Verified source: ${source.sourceName}`);

  // --------------------------------------------------
  // 3. Check existing knowledge record
  // --------------------------------------------------

  const existingKnowledge = await db.collection("knowledge").findOne({
    sourceId: hadith.sourceId,
    reference: hadith.reference,
  });

  if (existingKnowledge) {
    console.log("✓ Knowledge record already exists.");
    console.log("Nothing to ingest.");

    await client.close();
    return;
  }

  // --------------------------------------------------
  // 4. Prepare searchable text
  // --------------------------------------------------

  const searchableText = [
    hadith.translation?.text,
    hadith.narrator,
    hadith.reference,
    hadith.book,
    hadith.chapter,
  ]
    .filter(Boolean)
    .join(" ");

  if (!searchableText) {
    throw new Error("No searchable text found for this Hadith.");
  }

  // --------------------------------------------------
  // 5. Load embedding model
  // --------------------------------------------------

  console.log("Loading embedding model...");

  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  // --------------------------------------------------
  // 6. Generate embedding
  // --------------------------------------------------

  console.log("Creating embedding...");

  const output = await extractor(searchableText, {
    pooling: "mean",
    normalize: true,
  });

  const embedding = Array.from(output.data);

  if (embedding.length !== 384) {
    throw new Error(
      `Unexpected embedding dimensions: ${embedding.length}`
    );
  }

  console.log(`✓ Embedding dimensions: ${embedding.length}`);

  // --------------------------------------------------
  // 7. Create Knowledge record
  // --------------------------------------------------

  const knowledge = {
    title: `Hadith — ${hadith.reference}`,

    topic: hadith.book || "Hadith",

    content: hadith.translation?.text || "",

    sourceId: hadith.sourceId,

    sourceType: source.sourceType,

    sourceName: source.sourceName,

    reference: hadith.reference,

    originalText: hadith.arabicText,

    translation: hadith.translation,

    authorityLevel: source.authorityLevel,

    authenticity:
      hadith.authenticity?.grade ||
      source.authenticity,

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

  // --------------------------------------------------
  // 8. Insert Knowledge record
  // --------------------------------------------------

  const result = await db
    .collection("knowledge")
    .insertOne(knowledge);

  console.log("");
  console.log("=================================");
  console.log("SUCCESS");
  console.log("=================================");
  console.log(`Hadith: ${hadith.reference}`);
  console.log(`Knowledge ID: ${result.insertedId}`);
  console.log(`Embedding dimensions: ${embedding.length}`);
  console.log("Knowledge record created.");
  console.log("=================================");

  await client.close();
}

main().catch((error) => {
  console.error("");
  console.error("INGESTION ERROR");
  console.error(error);
  process.exit(1);
});