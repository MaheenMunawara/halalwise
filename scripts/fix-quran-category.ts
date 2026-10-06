import { loadEnvConfig } from "@next/env";
import { MongoClient } from "mongodb";

loadEnvConfig(process.cwd());

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

const client = new MongoClient(uri);

async function main() {
  try {
    await client.connect();

    const db = client.db("halalwise");

    const result = await db.collection("knowledge").updateMany(
      {
        $or: [
          {
            sourceName: {
              $regex: /^The Quran$/i,
            },
          },
          {
            sourceType: {
              $regex: /^Quran$/i,
            },
          },
        ],
        reference: {
          $regex: /Al-Baqarah.*2:275/i,
        },
      },
      {
        $set: {
          category: "quran",
          verificationStatus: "verified",
          verified: true,
          updatedAt: new Date(),
        },
      }
    );

    console.log("Quran category fix completed.");
    console.log(
      `Matched records: ${result.matchedCount}`
    );
    console.log(
      `Updated records: ${result.modifiedCount}`
    );

    const records = await db
      .collection("knowledge")
      .find({
        reference: {
          $regex: /Al-Baqarah.*2:275/i,
        },
      })
      .project({
        category: 1,
        sourceName: 1,
        sourceType: 1,
        reference: 1,
        verified: 1,
        verificationStatus: 1,
      })
      .toArray();

    console.log("\nUpdated records:");

    console.log(
      JSON.stringify(records, null, 2)
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(
    "Quran category fix failed:"
  );

  console.error(error);

  process.exit(1);
});