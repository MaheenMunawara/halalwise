import dotenv from "dotenv";
import path from "path";
import { MongoClient } from "mongodb";
import { pipeline } from "@huggingface/transformers";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing from .env.local");
}

const client = new MongoClient(uri);

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIMENSIONS = 384;

const AAOIFI_SOURCE_ID = "aaoifi-shariah-standard-31-gharar";

async function main() {
  await client.connect();

  const db = client.db("halalwise");

  const sources = db.collection("sources");
  const knowledge = db.collection("knowledge");

  console.log("Connected to MongoDB.");

  await sources.updateOne(
    { _id: AAOIFI_SOURCE_ID },
    {
      $set: {
        sourceName:
          "AAOIFI Shari’ah Standard No. (31): Controls on Gharar in Financial Transactions",
        sourceType: "Islamic Finance Standard",
        institution:
          "Accounting and Auditing Organization for Islamic Financial Institutions (AAOIFI)",
        authorityLevel: "Scholarly",
        methodology: "Islamic finance / Shariah standard",
        topic: "Gharar",
        reference: "Shari’ah Standard No. 31",
        sourceUrl: "https://aaoifi.com/download/24233/",
        verified: true,
        verificationStatus: "verified",
        verificationDate: new Date(),
        license: "Official AAOIFI publication",
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  console.log("✓ AAOIFI Gharar source verified.");

  console.log("Loading embedding model...");

  const extractor = await pipeline(
    "feature-extraction",
    EMBEDDING_MODEL
  );

  const ghararContent =
    "AAOIFI Shari’ah Standard No. 31 defines Gharar as a state of uncertainty that exists when a transaction involves an unknown aspect. The standard distinguishes excessive, medium, and minor Gharar and explains that the degree of Gharar affects its impact on a transaction.";

  const embeddingText = [
    "category: islamic-finance",
    "title: Gharar",
    "topic: Gharar",
    "content:",
    ghararContent,
    "reference: Shari’ah Standard No. 31",
    "concept: Gharar",
    "financialContext: Islamic financial transactions",
  ].join("\n");

  const output = await extractor(embeddingText, {
    pooling: "mean",
    normalize: true,
  });

  const embedding = Array.from(output.data);

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Unexpected embedding dimensions: ${embedding.length}`
    );
  }

  const result = await knowledge.updateOne(
    {
      title: "Gharar",
      category: "islamic-finance",
    },
    {
      $set: {
        category: "islamic-finance",
        title: "Gharar",
        topic: "Gharar",
        concept: "Gharar",
        financialContext: "Islamic financial transactions",

        content: ghararContent,

        sourceId: AAOIFI_SOURCE_ID,
        sourceUrl: "https://aaoifi.com/download/24233/",
        reference: "Shari’ah Standard No. 31",

        authorityLevel: "Scholarly",
        verificationStatus: "verified",
        verified: true,

        methodology: "Islamic finance / Shariah standard",
        authenticity:
          "Verified against official AAOIFI Shari’ah Standard No. 31",

        language: "English",

        attribution:
          "Accounting and Auditing Organization for Islamic Financial Institutions (AAOIFI)",

        license: "Official AAOIFI publication",

        embedding,
        embeddingModel: EMBEDDING_MODEL,
        embeddingDimensions: EMBEDDING_DIMENSIONS,
        embeddingUpdatedAt: new Date(),

        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    throw new Error(
      "The existing Gharar knowledge document was not found."
    );
  }

  console.log("✓ Gharar knowledge document updated.");
  console.log("✓ Gharar marked as verified.");
  console.log("✓ Gharar embedding regenerated.");
  console.log("");
  console.log("Migration completed successfully.");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await client.close();
  });