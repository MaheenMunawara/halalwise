import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  console.log("");
  console.log("=================================");
  console.log("HALALWISE HADITH BATCH VERIFICATION");
  console.log("=================================");
  console.log("");

  const client = new MongoClient(process.env.MONGODB_URI!);

  console.log("Connecting to MongoDB...");

  await client.connect();

  console.log("✓ Connected to MongoDB");

  const db = client.db("halalwise");

  // --------------------------------------------------
  // 1. Find verified Hadith
  // --------------------------------------------------

  const hadiths = await db
    .collection("hadith")
    .find({
      collection: "Sahih al-Bukhari",
      verified: true,
    })
    .toArray();

  console.log("");
  console.log(`Found ${hadiths.length} verified Hadith.`);
  console.log("");

  let passed = 0;
  let failed = 0;

  // --------------------------------------------------
  // 2. Verify each Hadith
  // --------------------------------------------------

  for (const hadith of hadiths) {
    console.log("---------------------------------");
    console.log(`Checking Bukhari ${hadith.hadithNumber}...`);

    let valid = true;

    // Check source
    const source = await db.collection("sources").findOne({
      _id: hadith.sourceId,
      verified: true,
    });

    if (!source) {
      console.log("✗ Verified source not found.");
      valid = false;
    } else {
      console.log("✓ Verified source");
    }

    // Check knowledge record
    const knowledge = await db.collection("knowledge").findOne({
      sourceId: hadith.sourceId,
      reference: hadith.reference,
    });

    if (!knowledge) {
      console.log("✗ Knowledge record not found.");
      valid = false;
    } else {
      console.log("✓ Knowledge record exists");
    }

    if (knowledge) {
      // Check verification status
      if (knowledge.verified !== true) {
        console.log("✗ Knowledge record is not verified.");
        valid = false;
      } else {
        console.log("✓ Knowledge record verified");
      }

      // Check embedding
      if (!Array.isArray(knowledge.embedding)) {
        console.log("✗ Embedding missing.");
        valid = false;
      } else if (knowledge.embedding.length !== 384) {
        console.log(
          `✗ Invalid embedding dimensions: ${knowledge.embedding.length}`
        );
        valid = false;
      } else {
        console.log("✓ Embedding: 384 dimensions");
      }

      // Check content
      if (!knowledge.content) {
        console.log("✗ Hadith content missing.");
        valid = false;
      } else {
        console.log("✓ Hadith content exists");
      }

      // Check authenticity
      if (!knowledge.authenticity) {
        console.log("✗ Authenticity metadata missing.");
        valid = false;
      } else {
        console.log(
          `✓ Authenticity: ${knowledge.authenticity}`
        );
      }

      // Check source ID consistency
      if (
        knowledge.sourceId?.toString() !==
        hadith.sourceId?.toString()
      ) {
        console.log("✗ Source ID mismatch.");
        valid = false;
      } else {
        console.log("✓ Source ID matches");
      }
    }

    if (valid) {
      console.log("✓ VERIFICATION PASSED");
      passed++;
    } else {
      console.log("✗ VERIFICATION FAILED");
      failed++;
    }

    console.log("---------------------------------");
  }

  // --------------------------------------------------
  // 3. Final report
  // --------------------------------------------------

  console.log("");
  console.log("=================================");
  console.log("BATCH VERIFICATION COMPLETE");
  console.log("=================================");
  console.log(`Total checked: ${hadiths.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("=================================");

  await client.close();

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("");
  console.error("VERIFICATION ERROR");
  console.error(error);
  process.exit(1);
});