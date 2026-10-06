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

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function makeKey(...values: unknown[]): string {
  return values.map(normalize).join(" | ");
}

async function main() {
  await client.connect();

  const db = client.db("halalwise");
  const knowledge = db.collection("knowledge");

  const documents = await knowledge
    .find({})
    .sort({ category: 1, title: 1 })
    .toArray();

  console.log("");
  console.log("========================================");
  console.log("HALALWISE KNOWLEDGE DUPLICATE DETECTOR");
  console.log("========================================");
  console.log("");

  console.log(`Documents found: ${documents.length}`);
  console.log("");

  const duplicateGroups = new Map<
    string,
    {
      reason: string;
      documents: any[];
    }
  >();

  function addDuplicate(
    key: string,
    reason: string,
    doc: any
  ) {
    if (!duplicateGroups.has(key)) {
      duplicateGroups.set(key, {
        reason,
        documents: [],
      });
    }

    duplicateGroups.get(key)!.documents.push(doc);
  }

  // --------------------------------------------------
  // 1. Same sourceId + reference
  // --------------------------------------------------

  for (const doc of documents) {
    if (doc.sourceId && doc.reference) {
      const key = `source-reference:${makeKey(
        doc.sourceId,
        doc.reference
      )}`;

      addDuplicate(key, "Same sourceId + reference", doc);
    }
  }

  // --------------------------------------------------
  // 2. Same category + reference
  // --------------------------------------------------

  for (const doc of documents) {
    if (doc.category && doc.reference) {
      const key = `category-reference:${makeKey(
        doc.category,
        doc.reference
      )}`;

      addDuplicate(key, "Same category + reference", doc);
    }
  }

  // --------------------------------------------------
  // 3. Same category + title
  // --------------------------------------------------

  for (const doc of documents) {
    if (doc.category && doc.title) {
      const key = `category-title:${makeKey(
        doc.category,
        doc.title
      )}`;

      addDuplicate(key, "Same category + title", doc);
    }
  }

  // --------------------------------------------------
  // 4. Hadith-specific duplicate identity
  // --------------------------------------------------

  for (const doc of documents) {
    if (
      doc.category === "hadith" &&
      doc.collection &&
      doc.hadithNumber
    ) {
      const key = `hadith:${makeKey(
        doc.collection,
        doc.hadithNumber
      )}`;

      addDuplicate(
        key,
        "Same Hadith collection + Hadith number",
        doc
      );
    }
  }

  // --------------------------------------------------
  // 5. Qur'an-specific duplicate identity
  // --------------------------------------------------

  for (const doc of documents) {
    if (
      doc.category === "quran" &&
      doc.surahNumber &&
      doc.ayahNumber
    ) {
      const key = `quran:${makeKey(
        doc.surahNumber,
        doc.ayahNumber,
        doc.translationName,
        doc.translator
      )}`;

      addDuplicate(
        key,
        "Same Qur'an ayah + translation",
        doc
      );
    }
  }

  // --------------------------------------------------
  // Remove groups containing only one document
  // --------------------------------------------------

  const actualDuplicates = Array.from(
    duplicateGroups.entries()
  ).filter(([, group]) => group.documents.length > 1);

  console.log("========================================");
  console.log("DUPLICATE ANALYSIS");
  console.log("========================================");
  console.log("");

  if (actualDuplicates.length === 0) {
    console.log("✓ No duplicate groups detected.");
  } else {
    console.log(
      `⚠ Duplicate groups detected: ${actualDuplicates.length}`
    );
    console.log("");

    for (const [key, group] of actualDuplicates) {
      console.log("----------------------------------------");
      console.log(`Reason: ${group.reason}`);
      console.log(`Key: ${key}`);
      console.log(
        `Documents in group: ${group.documents.length}`
      );
      console.log("");

      for (const doc of group.documents) {
        console.log({
          id: String(doc._id),
          title: doc.title,
          category: doc.category,
          sourceId: doc.sourceId,
          sourceName: doc.sourceName,
          reference: doc.reference,
          collection: doc.collection,
          hadithNumber: doc.hadithNumber,
          surahNumber: doc.surahNumber,
          ayahNumber: doc.ayahNumber,
          verified: doc.verified,
        });
      }

      console.log("");
    }
  }

  console.log("========================================");
  console.log("SUMMARY");
  console.log("========================================");
  console.log("");

  console.log(`Documents checked: ${documents.length}`);
  console.log(
    `Duplicate groups: ${actualDuplicates.length}`
  );

  if (actualDuplicates.length > 0) {
    console.log("");
    console.log(
      "⚠ No documents were deleted or modified."
    );
    console.log(
      "Review the duplicate groups before making changes."
    );
  } else {
    console.log("");
    console.log("✓ No duplicates detected.");
  }

  console.log("");
}

main()
  .catch((error) => {
    console.error("Duplicate detection failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await client.close();
  });