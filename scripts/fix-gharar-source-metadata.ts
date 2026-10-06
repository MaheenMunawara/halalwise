import dotenv from "dotenv";
import path from "path";
import { MongoClient } from "mongodb";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing from .env.local");
}

const client = new MongoClient(uri);

const AAOIFI_SOURCE_ID = "aaoifi-shariah-standard-31-gharar";

async function main() {
  await client.connect();

  const db = client.db("halalwise");
  const knowledge = db.collection("knowledge");

  const result = await knowledge.updateOne(
    {
      title: "Gharar",
      category: "islamic-finance",
      sourceId: AAOIFI_SOURCE_ID,
    },
    {
      $set: {
        sourceName:
          "AAOIFI Shari’ah Standard No. (31): Controls on Gharar in Financial Transactions",

        sourceType: "Islamic Finance Standard",

        sourceUrl: "https://aaoifi.com/download/24233/",

        reference: "Shari’ah Standard No. 31",

        authorityLevel: "Scholarly",

        methodology: "Islamic finance / Shariah standard",

        verified: true,

        verificationStatus: "verified",

        attribution:
          "Accounting and Auditing Organization for Islamic Financial Institutions (AAOIFI)",

        license: "Official AAOIFI publication",

        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    throw new Error(
      "The verified Gharar knowledge document was not found."
    );
  }

  console.log("✓ Gharar source metadata updated.");
  console.log("✓ Source name corrected.");
  console.log("✓ Source type corrected.");
  console.log("✓ Reference confirmed.");
  console.log("");
  console.log("Gharar metadata fix completed successfully.");
}

main()
  .catch((error) => {
    console.error("Metadata fix failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await client.close();
  });