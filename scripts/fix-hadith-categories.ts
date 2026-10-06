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
            collection: {
              $regex: /bukhari/i,
            },
          },
          {
            sourceName: {
              $regex: /sahih al-bukhari/i,
            },
          },
          {
            sourceType: {
              $regex: /hadith/i,
            },
          },
        ],
      },
      {
        $set: {
          category: "hadith",
          verificationStatus: "verified",
          verified: true,
          updatedAt: new Date(),
        },
      }
    );

    console.log("Hadith category fix completed.");
    console.log(
      `Matched records: ${result.matchedCount}`
    );
    console.log(
      `Updated records: ${result.modifiedCount}`
    );

    const records = await db
      .collection("knowledge")
      .find({
        category: "hadith",
      })
      .project({
        category: 1,
        title: 1,
        collection: 1,
        hadithNumber: 1,
        sourceName: 1,
        sourceType: 1,
        reference: 1,
        verified: 1,
        verificationStatus: 1,
      })
      .toArray();

    console.log("\nHadith records:");

    console.log(
      JSON.stringify(records, null, 2)
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("Hadith category fix failed:");
  console.error(error);
  process.exit(1);
});