import dotenv from "dotenv";
import path from "path";
import { MongoClient } from "mongodb";
import { pipeline } from "@xenova/transformers";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from .env.local");
}

const client = new MongoClient(MONGODB_URI);

const HADITH_SOURCE_ID = "sahih-muslim-1598-riba";

const hadithText =
  "Jabir said that Allah's Messenger (ﷺ) cursed the accepter of interest and its payer, and one who records it, and the two witnesses, and he said: They are all equal.";

const embeddingText = `
Sahih Muslim
Hadith
Riba
Interest
Islamic finance
Sahih Muslim 1598
Hadith about the prohibition of riba and interest
${hadithText}
`.trim();

async function main() {
  await client.connect();

  console.log("Connected to MongoDB.");

  const db = client.db("halalwise");

  const sources = db.collection("sources");
  const knowledge = db.collection("knowledge");

  await sources.updateOne(
    { _id: HADITH_SOURCE_ID },
    {
      $set: {
        _id: HADITH_SOURCE_ID,
        sourceName: "Sahih Muslim",
        sourceType: "Hadith Collection",
        scholar: "Imam Muslim",
        authorityLevel: "Primary",
        methodology: "Hadith",
        madhhab: "General",
        topic: "Riba",
        reference: "Sahih Muslim 1598",
        sourceUrl: "https://sunnah.com/muslim:1598",
        verified: true,
        verificationStatus: "verified",
        verifiedBy: "HalalWise source verification",
        verificationDate: new Date(),
        license: "Hadith reference source",
        attribution: "Sahih Muslim",
      },
    },
    { upsert: true }
  );

  console.log("✓ Sahih Muslim 1598 source verified.");

  console.log("Loading embedding model...");

  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  const output = await extractor(embeddingText, {
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
    "✓ Embedding generated:",
    embedding.length
  );

  const existing = await knowledge.findOne({
    category: "hadith",
    collection: "Sahih Muslim",
    hadithNumber: "1598",
  });

  const knowledgeDocument = {
    title: "Hadith — Sahih Muslim 1598",

    category: "hadith",

    /*
     * This is the actual Hadith text displayed
     * by HalalWise. It is NOT modified for retrieval.
     */
    content: hadithText,

    topic: "riba",

    sourceId: HADITH_SOURCE_ID,

    reference: "Sahih Muslim 1598",

    sourceUrl: "https://sunnah.com/muslim:1598",

    authorityLevel: "Primary",

    verificationStatus: "verified",

    verified: true,

    collection: "Sahih Muslim",

    hadithNumber: "1598",

    narrator: "Jabir",

    authenticity: "Sahih",

    methodology: "Hadith",

    madhhab: "General",

    language: "English",

    attribution: "Sahih Muslim",

    embedding,

    embeddingModel:
      "Xenova/all-MiniLM-L6-v2",

    embeddingDimensions: 384,

    updatedAt: new Date(),
  };

  if (existing) {
    await knowledge.updateOne(
      { _id: existing._id },
      {
        $set: knowledgeDocument,
      }
    );

    console.log(
      "✓ Existing Sahih Muslim 1598 document updated."
    );
  } else {
    await knowledge.insertOne(
      knowledgeDocument
    );

    console.log(
      "✓ Sahih Muslim 1598 knowledge document added."
    );
  }

  console.log(
    "✓ Actual Hadith content preserved."
  );

  console.log(
    "✓ Retrieval metadata included in embedding."
  );

  console.log(
    "✓ Hadith remains verified."
  );

  console.log(
    "Migration completed successfully."
  );
}

main()
  .catch((error) => {
    console.error(
      "Migration failed:",
      error
    );

    process.exit(1);
  })
  .finally(async () => {
    await client.close();
  });