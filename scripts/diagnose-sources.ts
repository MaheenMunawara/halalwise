import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined in .env.local");
}

function displayValue(value: any): string {
  if (value === undefined || value === null) {
    return "MISSING";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db("halalwise");
    const collection = db.collection("sources");

    const documents = await collection.find({}).toArray();

    console.log("\n========================================");
    console.log("HALALWISE SOURCE DIAGNOSTIC");
    console.log("========================================\n");

    console.log(`Sources found: ${documents.length}\n`);

    for (const [index, doc] of documents.entries()) {
      console.log("----------------------------------------");
      console.log(`SOURCE ${index + 1}`);
      console.log("----------------------------------------");

      console.log(`_id: ${displayValue(doc._id)}`);
      console.log(`sourceId: ${displayValue(doc.sourceId)}`);
      console.log(`name: ${displayValue(doc.name)}`);
      console.log(`sourceName: ${displayValue(doc.sourceName)}`);
      console.log(`sourceType: ${displayValue(doc.sourceType)}`);
      console.log(`category: ${displayValue(doc.category)}`);
      console.log(`authorityLevel: ${displayValue(doc.authorityLevel)}`);
      console.log(`verified: ${displayValue(doc.verified)}`);
      console.log(
        `verificationStatus: ${displayValue(doc.verificationStatus)}`
      );
      console.log(`verifiedBy: ${displayValue(doc.verifiedBy)}`);
      console.log(`verifiedAt: ${displayValue(doc.verifiedAt)}`);
      console.log(`sourceUrl: ${displayValue(doc.sourceUrl)}`);
      console.log(`reference: ${displayValue(doc.reference)}`);
      console.log(`methodology: ${displayValue(doc.methodology)}`);
      console.log(`madhhab: ${displayValue(doc.madhhab)}`);
      console.log(`license: ${displayValue(doc.license)}`);
      console.log(`attribution: ${displayValue(doc.attribution)}`);

      console.log("\nAll fields:");
      console.log(Object.keys(doc).sort().join(", "));

      console.log("");
    }

    console.log("========================================");
    console.log("END OF SOURCE DIAGNOSTIC");
    console.log("========================================\n");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("\nSource diagnostic failed:");
  console.error(error);
  process.exit(1);
});