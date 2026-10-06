import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing from .env.local");
}

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db("halalwise");
    const knowledge = db.collection("knowledge");

    const result = await knowledge.updateOne(
      {
        title: "Zakat",
        category: "quran",
      },
      {
        $set: {
          translationName: "Clear Quran",
          translator: "Talal Itani",
          attribution:
            "Translation by Talal Itani, ClearQuran.com",
          updatedAt: new Date(),
        },
      }
    );

    console.log("\n========================================");
    console.log("ZAKAT METADATA FIX");
    console.log("========================================\n");

    if (result.matchedCount === 0) {
      console.log("✗ Zakat document was not found.");
      process.exitCode = 1;
      return;
    }

    if (result.modifiedCount === 1) {
      console.log("✓ Zakat metadata updated successfully.");
    } else {
      console.log(
        "✓ Zakat already contained the requested metadata."
      );
    }

    console.log("\nAdded/verified:");
    console.log("  Translation: Clear Quran");
    console.log("  Translator: Talal Itani");
    console.log(
      "  Attribution: Translation by Talal Itani, ClearQuran.com"
    );

    console.log("\nNo other knowledge documents were modified.");
    console.log("========================================\n");
  } catch (error) {
    console.error("\nZakat metadata fix failed:");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();