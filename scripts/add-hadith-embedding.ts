import { pipeline } from "@huggingface/transformers";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

async function main() {
  console.log("Loading embedding model...");

  const embeddingModel = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  console.log("Connecting to MongoDB...");

  const client = new MongoClient(uri);

  await client.connect();

  const db = client.db("halalwise");

  const hadithId = new ObjectId(
    "6aa00f6f30d2b75acb9ea507"
  );

  const hadith = await db
    .collection("knowledge")
    .findOne({
      _id: hadithId,
    });

  if (!hadith) {
    throw new Error(
      "Hadith on Intentions knowledge document not found."
    );
  }

  console.log("Found:", hadith.title);

  const text = `
${hadith.title}

${hadith.topic}

${hadith.content}

${hadith.reference}

${hadith.methodology}
`;

  console.log("Creating embedding...");

  const output = await embeddingModel(text, {
    pooling: "mean",
    normalize: true,
  });

  const embedding = Array.from(output.data);

  console.log(
    "Embedding dimensions:",
    embedding.length
  );

  if (embedding.length !== 384) {
    throw new Error(
      `Expected 384 dimensions but got ${embedding.length}`
    );
  }

  await db.collection("knowledge").updateOne(
    {
      _id: hadithId,
    },
    {
      $set: {
        embedding,
        updatedAt: new Date(),
      },
    }
  );

  console.log("");
  console.log("========================================");
  console.log("SUCCESS");
  console.log("========================================");
  console.log("Hadith:", hadith.title);
  console.log("Knowledge ID:", hadithId.toString());
  console.log("Embedding dimensions:", embedding.length);
  console.log("Embedding saved successfully.");
  console.log("========================================");

  await client.close();
}

main().catch((error) => {
  console.error("ERROR:", error);
  process.exit(1);
});