
import { pipeline } from "@huggingface/transformers";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

async function main() {
  console.log("=================================");
  console.log("HALALWISE HADITH BATCH INGESTION");
  console.log("=================================");
  console.log("");

  console.log("Connecting to MongoDB...");

  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db("halalwise");

  console.log("✓ Connected to MongoDB");
  console.log("");

  // --------------------------------------------------
  // 1. Find all verified Bukhari Hadith
  // --------------------------------------------------

  const hadiths = await db
    .collection("hadith")
    .find({
      collection: "Sahih al-Bukhari",
      verified: true,
    })
    .sort({ hadithNumber: 1 })
    .toArray();

  console.log(`Found ${hadiths.length} verified Hadith.`);
  console.log("");

  if (hadiths.length === 0) {
    console.log("No verified Hadith found.");
    await client.close();
    return;
  }

  // --------------------------------------------------
  // 2. Load embedding model once
  // --------------------------------------------------

  console.log("Loading embedding model...");

  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  console.log("✓ Embedding model loaded");
  console.log("");

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  // --------------------------------------------------
  // 3. Process each Hadith
  // --------------------------------------------------

  for (const hadith of hadiths) {
    try {
      console.log("---------------------------------");
      console.log(
        `Processing Bukhari ${hadith.hadithNumber}...`
      );

      // ------------------------------------------------
      // Verify linked source
      // ------------------------------------------------

      const source = await db.collection("sources").findOne({
        _id: hadith.sourceId,
        verified: true,
      });

      if (!source) {
        console.log(
          `✗ Verified source not found for ${hadith.reference}`
        );

        failed++;
        continue;
      }

      console.log(`✓ Source verified: ${source.sourceName}`);

      // ------------------------------------------------
      // Check duplicate
      // ------------------------------------------------

      const existingKnowledge = await db
        .collection("knowledge")
        .findOne({
          sourceId: hadith.sourceId,
          reference: hadith.reference,
        });

      if (existingKnowledge) {
        console.log("✓ Knowledge record already exists.");
        console.log("→ Skipping.");

        skipped++;
        continue;
      }

      // ------------------------------------------------
      // Prepare searchable text
      // ------------------------------------------------

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
        console.log("✗ No searchable text found.");

        failed++;
        continue;
      }

      // ------------------------------------------------
      // Generate embedding
      // ------------------------------------------------

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

      console.log(
        `✓ Embedding created: ${embedding.length} dimensions`
      );

      // ------------------------------------------------
      // Create knowledge record
      // ------------------------------------------------

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

      // ------------------------------------------------
      // Insert knowledge record
      // ------------------------------------------------

      const result = await db
        .collection("knowledge")
        .insertOne(knowledge);

      console.log("✓ Knowledge record created.");

      console.log(
        `✓ Knowledge ID: ${result.insertedId}`
      );

      inserted++;
    } catch (error) {
      console.error(
        `✗ Failed to ingest ${hadith.reference}:`,
        error
      );

      failed++;
    }
  }

  // --------------------------------------------------
  // 4. Final summary
  // --------------------------------------------------

  console.log("");
  console.log("=================================");
  console.log("BATCH INGESTION COMPLETE");
  console.log("=================================");

  console.log(`Total Hadith found: ${hadiths.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);

  console.log("=================================");

  await client.close();
}

main().catch((error) => {
  console.error("");
  console.error("BATCH INGESTION ERROR");
  console.error(error);
  process.exit(1);
});
