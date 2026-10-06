import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing from .env.local");
}

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIMENSIONS = 384;

type ValidationResult = {
  title: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
};

function normalizeSourceId(value: any): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "$oid" in value
  ) {
    const oid = String(value.$oid);
    return oid.trim() || null;
  }

  if (value instanceof ObjectId) {
    return value.toHexString();
  }

  return null;
}

function requireField(
  doc: any,
  field: string,
  errors: string[]
) {
  const value = doc[field];

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    errors.push(`Missing required field: ${field}`);
  }
}

function validateCommonFields(
  doc: any,
  errors: string[],
  warnings: string[]
) {
  requireField(doc, "category", errors);
  requireField(doc, "title", errors);
  requireField(doc, "content", errors);
  requireField(doc, "reference", errors);
  requireField(doc, "authorityLevel", errors);
  requireField(doc, "verificationStatus", errors);
  requireField(doc, "verified", errors);
  requireField(doc, "methodology", errors);
  requireField(doc, "madhhab", errors);

  const embedding = doc.embedding;

  if (!Array.isArray(embedding)) {
    errors.push("Embedding is missing or is not an array");
  } else {
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      errors.push(
        `Embedding dimensions are ${embedding.length}, expected ${EMBEDDING_DIMENSIONS}`
      );
    }
  }

  if (doc.embeddingModel !== EMBEDDING_MODEL) {
    errors.push(
      `Invalid embeddingModel: ${doc.embeddingModel || "MISSING"}`
    );
  }

  if (doc.embeddingDimensions !== EMBEDDING_DIMENSIONS) {
    errors.push(
      `Invalid embeddingDimensions: ${
        doc.embeddingDimensions || "MISSING"
      }`
    );
  }

  if (doc.verified === true) {
    const sourceId = normalizeSourceId(doc.sourceId);

    if (!sourceId) {
      errors.push(
        "Verified document has no valid sourceId"
      );
    }
  }

  if (
    doc.verificationStatus !== "verified" &&
    doc.verificationStatus !== "active" &&
    doc.verified === true
  ) {
    errors.push(
      `verified=true but verificationStatus is "${doc.verificationStatus}"`
    );
  }

  if (
    doc.verificationStatus === "unverified" &&
    doc.verified === true
  ) {
    errors.push(
      "verificationStatus=unverified but verified=true"
    );
  }

  if (
    doc.verificationStatus === "unverified" &&
    doc.verified !== false
  ) {
    warnings.push(
      "Unverified document should have verified=false"
    );
  }
}

function validateCategoryFields(
  doc: any,
  errors: string[]
) {
  const category = String(doc.category || "")
    .trim()
    .toLowerCase();

  switch (category) {
    case "quran":
      requireField(doc, "surahNumber", errors);
      requireField(doc, "ayahNumber", errors);
      requireField(doc, "translationName", errors);
      requireField(doc, "translator", errors);
      break;

    case "hadith":
      requireField(doc, "collection", errors);
      requireField(doc, "hadithNumber", errors);
      requireField(doc, "authenticity", errors);
      break;

    case "tafsir":
      requireField(doc, "surahNumber", errors);
      requireField(doc, "ayahNumber", errors);
      requireField(doc, "tafsirName", errors);
      requireField(doc, "scholar", errors);
      break;

    case "fiqh":
      requireField(doc, "ruling", errors);
      requireField(doc, "madhhab", errors);
      break;

    case "islamic-finance":
      requireField(doc, "topic", errors);
      break;

    case "scholarly":
      requireField(doc, "scholar", errors);
      break;

    case "general":
      break;

    default:
      errors.push(
        `Unknown knowledge category: ${
          doc.category || "MISSING"
        }`
      );
  }
}

async function findSource(
  sources: any,
  sourceIdValue: any
) {
  const sourceId = normalizeSourceId(sourceIdValue);

  if (!sourceId) {
    return null;
  }

  /*
   * Current HalalWise source documents use string _id values.
   */

  let source = await sources.findOne({
    _id: sourceId,
  });

  if (source) {
    return source;
  }

  /*
   * Also support ObjectId source documents.
   */

  if (ObjectId.isValid(sourceId)) {
    source = await sources.findOne({
      _id: new ObjectId(sourceId),
    });

    if (source) {
      return source;
    }
  }

  /*
   * Future compatibility:
   * support a dedicated sourceId field if added later.
   */

  source = await sources.findOne({
    sourceId,
  });

  return source;
}

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db("halalwise");

    const knowledge = db.collection("knowledge");
    const sources = db.collection("sources");

    console.log("\n========================================");
    console.log("HALALWISE KNOWLEDGE SCHEMA VALIDATION");
    console.log("========================================\n");

    const documents = await knowledge
      .find({})
      .sort({ title: 1 })
      .toArray();

    console.log(
      `Documents found: ${documents.length}\n`
    );

    const results: ValidationResult[] = [];

    for (const doc of documents) {
      const title = String(
        doc.title || "Untitled document"
      );

      const errors: string[] = [];
      const warnings: string[] = [];

      validateCommonFields(
        doc,
        errors,
        warnings
      );

      validateCategoryFields(
        doc,
        errors
      );

      /*
       * Verified knowledge must point to a verified source.
       */

      if (doc.verified === true) {
        const source = await findSource(
          sources,
          doc.sourceId
        );

        if (!source) {
          errors.push(
            `Verified source not found for sourceId: ${normalizeSourceId(
              doc.sourceId
            ) || "MISSING"}`
          );
        } else {
          if (source.verified !== true) {
            errors.push(
              "Linked source exists but is not verified"
            );
          }

          if (
            source.verificationStatus &&
            source.verificationStatus !== "verified" &&
            source.verificationStatus !== "active"
          ) {
            errors.push(
              `Linked source verificationStatus is "${source.verificationStatus}"`
            );
          }
        }
      }

      /*
       * Gharar and Halal Investing are intentionally
       * unverified until a verified source is attached.
       */

      if (
        doc.verificationStatus === "unverified" &&
        doc.verified === false
      ) {
        warnings.push(
          "Document is intentionally unverified and will not be trusted by RAG"
        );
      }

      const valid = errors.length === 0;

      results.push({
        title,
        valid,
        errors,
        warnings,
      });
    }

    console.log("----------------------------------------");
    console.log("VALIDATION RESULTS");
    console.log("----------------------------------------\n");

    for (const result of results) {
      if (result.valid) {
        console.log(`✓ PASS: ${result.title}`);
      } else {
        console.log(`✗ FAIL: ${result.title}`);

        for (const error of result.errors) {
          console.log(`  ERROR: ${error}`);
        }
      }

      for (const warning of result.warnings) {
        console.log(`  WARNING: ${warning}`);
      }

      console.log("");
    }

    const passed = results.filter(
      (result) => result.valid
    ).length;

    const failed = results.length - passed;

    console.log("========================================");
    console.log("VALIDATION SUMMARY");
    console.log("========================================");

    console.log(
      `Documents checked: ${results.length}`
    );

    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    console.log(
      `Embedding model: ${EMBEDDING_MODEL}`
    );

    console.log(
      `Embedding dimensions: ${EMBEDDING_DIMENSIONS}`
    );

    console.log("");

    if (failed === 0) {
      console.log(
        "✓ KNOWLEDGE SCHEMA VALIDATION PASSED"
      );
    } else {
      console.log(
        "✗ KNOWLEDGE SCHEMA VALIDATION FAILED"
      );
    }

    console.log(
      "\nNo database documents were modified."
    );

    console.log("\n========================================\n");

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      "\nKnowledge validation failed:"
    );

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