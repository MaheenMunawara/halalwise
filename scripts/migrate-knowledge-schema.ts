import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing from .env.local");
}

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIMENSIONS = 384;

function getHadithNumber(reference: string): number | null {
  const match = reference.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db("halalwise");
    const knowledge = db.collection("knowledge");
    const sources = db.collection("sources");

    console.log("\n========================================");
    console.log("HALALWISE KNOWLEDGE SCHEMA MIGRATION");
    console.log("========================================\n");

    const documents = await knowledge.find({}).toArray();

    console.log(`Knowledge documents found: ${documents.length}\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const doc of documents) {
      const title = String(doc.title || "");

      const setFields: Record<string, any> = {
        embeddingModel:
          doc.embeddingModel || EMBEDDING_MODEL,

        embeddingDimensions:
          doc.embeddingDimensions ||
          (Array.isArray(doc.embedding)
            ? doc.embedding.length
            : EMBEDDING_DIMENSIONS),
      };

      const unsetFields: Record<string, any> = {};

      // --------------------------------------------------
      // PROHIBITION OF RIBA
      // --------------------------------------------------
      if (title === "Prohibition of Riba") {
        setFields.category = "quran";
        setFields.sourceId = "6a9cb888887ff4bfd521cc20";
        setFields.verificationStatus =
          doc.verificationStatus || "verified";

        setFields.surahNumber = 2;
        setFields.ayahNumber = 275;
        setFields.translationName = "Clear Quran";
        setFields.translator = "Talal Itani";
        setFields.language = doc.language || "English";
        setFields.authorityLevel =
          doc.authorityLevel || "Primary";

        setFields.attribution =
          doc.attribution ||
          "Translation by Talal Itani, ClearQuran.com";

        setFields.updatedAt = new Date();
      }

      // --------------------------------------------------
      // ZAKAT
      // --------------------------------------------------
      else if (title === "Zakat") {
        setFields.category = "quran";
        setFields.sourceId = "6a9cb888887ff4bfd521cc20";
        setFields.verificationStatus =
          doc.verificationStatus || "verified";

        setFields.surahNumber = 2;
        setFields.ayahNumber = 43;
        setFields.language = doc.language || "English";
        setFields.authorityLevel =
          doc.authorityLevel || "Primary";

        setFields.updatedAt = new Date();
      }

      // --------------------------------------------------
      // GHARAR
      // --------------------------------------------------
      else if (title === "Gharar") {
        setFields.category = "islamic-finance";

        /*
         * Gharar currently has no verified sourceId.
         * Therefore we must NOT claim it is verified.
         */
        if (!doc.sourceId) {
          setFields.verificationStatus = "unverified";
          setFields.verified = false;
        }

        setFields.updatedAt = new Date();

        /*
         * These fields were incorrectly associated with
         * Gharar as if it were a Hadith.
         *
         * They must be removed in a SEPARATE operation.
         */
        unsetFields.collection = "";
        unsetFields.hadithNumber = "";
      }

      // --------------------------------------------------
      // HALAL INVESTING
      // --------------------------------------------------
      else if (title === "Halal Investing") {
        setFields.category = "islamic-finance";

        /*
         * No verified source is currently attached,
         * so keep this document untrusted.
         */
        if (!doc.sourceId) {
          setFields.verificationStatus = "unverified";
          setFields.verified = false;
        }

        setFields.updatedAt = new Date();
      }

      // --------------------------------------------------
      // HADITH DOCUMENTS
      // --------------------------------------------------
      else if (
        String(doc.category || "").toLowerCase() === "hadith" ||
        title.toLowerCase().includes("hadith")
      ) {
        const reference = String(doc.reference || "");
        const hadithNumber = getHadithNumber(reference);

        setFields.category = "hadith";
        setFields.collection =
          doc.collection || "Sahih al-Bukhari";

        if (hadithNumber !== null) {
          setFields.hadithNumber = hadithNumber;
        }

        setFields.authorityLevel =
          doc.authorityLevel || "Primary";

        setFields.authenticity =
          doc.authenticity || "Sahih";

        setFields.madhhab =
          doc.madhhab || "General";

        setFields.verificationStatus =
          doc.verificationStatus || "verified";

        setFields.updatedAt = new Date();
      }

      // --------------------------------------------------
      // UNKNOWN DOCUMENT
      // --------------------------------------------------
      else {
        skippedCount++;

        console.log(`○ Skipped: ${title || "Untitled"}`);
        continue;
      }

      /*
       * IMPORTANT:
       *
       * MongoDB does not allow the same path to appear
       * in both $set and $unset in one update.
       *
       * Therefore:
       * 1. Apply $set first.
       * 2. Apply $unset separately.
       */

      if (Object.keys(setFields).length > 0) {
        await knowledge.updateOne(
          { _id: doc._id },
          { $set: setFields }
        );
      }

      if (Object.keys(unsetFields).length > 0) {
        await knowledge.updateOne(
          { _id: doc._id },
          { $unset: unsetFields }
        );
      }

      updatedCount++;

      console.log(`✓ Updated: ${title}`);

      const changedFields = [
        ...Object.keys(setFields),
        ...Object.keys(unsetFields).map(
          (field) => `${field} removed`
        ),
      ];

      console.log(
        `  Fields updated: ${changedFields.join(", ")}`
      );
    }

    // --------------------------------------------------
    // UPDATE VERIFIED SOURCES
    // --------------------------------------------------

    const verifiedSourceResult = await sources.updateMany(
      { verified: true },
      {
        $set: {
          verificationStatus: "verified",
          updatedAt: new Date(),
        },
      }
    );

    console.log(
      `\n✓ Verified sources updated: ${verifiedSourceResult.modifiedCount}`
    );

    console.log("\n========================================");
    console.log("MIGRATION COMPLETE");
    console.log("========================================");

    console.log(`Documents updated: ${updatedCount}`);
    console.log(`Documents skipped: ${skippedCount}`);

    console.log("\nEmbedding model:");
    console.log(EMBEDDING_MODEL);

    console.log("\nEmbedding dimensions:");
    console.log(EMBEDDING_DIMENSIONS);

    console.log("\nNo embeddings were regenerated.");
    console.log("Existing embeddings were preserved.\n");
  } catch (error) {
    console.error("\nKnowledge migration failed:");

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