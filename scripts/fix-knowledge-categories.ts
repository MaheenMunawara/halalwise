import { loadEnvConfig } from "@next/env";
import { MongoClient } from "mongodb";

loadEnvConfig(process.cwd());

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    "MONGODB_URI is not defined. Check that .env.local exists in the project root."
  );
}

const client = new MongoClient(uri);

async function main() {
  try {
    await client.connect();

    const db = client.db("halalwise");
    const knowledge = db.collection("knowledge");

    const result = await knowledge.updateMany(
      {
        title: "Prohibition of Riba",
      },
      {
        $set: {
          category: "islamic-finance",
          updatedAt: new Date(),
        },
      }
    );

    console.log("Knowledge category update complete.");
    console.log(`Matched: ${result.matchedCount}`);
    console.log(`Modified: ${result.modifiedCount}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Update failed:", error);
  process.exit(1);
});