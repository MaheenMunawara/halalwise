import dotenv from "dotenv";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { pipeline } from "@huggingface/transformers";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from .env.local");
}

const DB_NAME = "halalwise";
const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_DIMENSIONS = 384;

type KnowledgeCategory =
  | "quran"
  | "hadith"
  | "tafsir"
  | "fiqh"
  | "islamic-finance"
  | "scholarly"
  | "general";

let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    console.log("Loading embedding model...");

    extractor = await pipeline(
      "feature-extraction",
      EMBEDDING_MODEL
    );

    console.log("✓ Embedding model loaded.");
  }

  return extractor;
}

function normalizeCategory(value: any): KnowledgeCategory {
  const category = String(value || "")
    .trim()
    .toLowerCase();

  const allowed: KnowledgeCategory[] = [
    "quran",
    "hadith",
    "tafsir",
    "fiqh",
    "islamic-finance",
    "scholarly",
    "general",
  ];

  if (allowed.includes(category as KnowledgeCategory)) {
    return category as KnowledgeCategory;
  }

  return "general";
}

function normalizeSourceId(value: any): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof ObjectId) {
    return value.toHexString();
  }

  if (
    typeof value === "object" &&
    "$oid" in value
  ) {
    const oid = String(value.$oid);

    if (ObjectId.isValid(oid)) {
      return oid;
    }
  }

  return String(value);
}

async function getVerifiedSource(
  db: any,
  sourceId: any
) {
  const normalized = normalizeSourceId(sourceId);

  if (!normalized) {
    return null;
  }

  const sources = db.collection("sources");

  const byStringId = await sources.findOne({
    _id: normalized,
  });

  if (byStringId) {
    return byStringId;
  }

  if (ObjectId.isValid(normalized)) {
    const byObjectId = await sources.findOne({
      _id: new ObjectId(normalized),
    });

    if (byObjectId) {
      return byObjectId;
    }
  }

  const bySourceId = await sources.findOne({
    sourceId: normalized,
  });

  return bySourceId || null;
}

function buildEmbeddingText(document: any) {
  return [
    document.category,
    document.title,
    document.topic,
    document.content,
    document.reference,
  ]
    .filter(Boolean)
    .join(". ");
}

function getDuplicateKey(document: any) {
  const category = normalizeCategory(document.category);

  if (
    category === "hadith" &&
    document.collection &&
    document.hadithNumber
  ) {
    return [
      "hadith",
      String(document.collection).trim().toLowerCase(),
      String(document.hadithNumber).trim(),
    ].join("|");
  }

  if (
    category === "quran" &&
    document.surahNumber &&
    document.ayahNumber
  ) {
    return [
      "quran",
      String(document.surahNumber),
      String(document.ayahNumber),
      String(document.translationName || "")
        .trim()
        .toLowerCase(),
    ].join("|");
  }

  if (document.sourceId && document.reference) {
    return [
      category,
      normalizeSourceId(document.sourceId),
      String(document.reference)
        .trim()
        .toLowerCase(),
    ].join("|");
  }

  if (document.reference) {
    return [
      category,
      String(document.reference)
        .trim()
        .toLowerCase(),
    ].join("|");
  }

  return [
    category,
    String(document.title || "")
      .trim()
      .toLowerCase(),
  ].join("|");
}

function validateDocument(document: any) {
  const errors: string[] = [];

  if (!document.title) {
    errors.push("missing title");
  }

  if (!document.content) {
    errors.push("missing content");
  }

  if (!document.category) {
    errors.push("missing category");
  }

  if (!document.reference) {
    errors.push("missing reference");
  }

  const category = normalizeCategory(
    document.category
  );

  if (category === "quran") {
    if (!document.surahNumber) {
      errors.push("Quran document missing surahNumber");
    }

    if (!document.ayahNumber) {
      errors.push("Quran document missing ayahNumber");
    }

    if (!document.translationName) {
      errors.push(
        "Quran document missing translationName"
      );
    }

    if (!document.translator) {
      errors.push(
        "Quran document missing translator"
      );
    }
  }

  if (category === "hadith") {
    if (!document.collection) {
      errors.push(
        "Hadith document missing collection"
      );
    }

    if (!document.hadithNumber) {
      errors.push(
        "Hadith document missing hadithNumber"
      );
    }

    if (!document.authenticity) {
      errors.push(
        "Hadith document missing authenticity"
      );
    }
  }

  return errors;
}

async function main() {
  console.log("");
  console.log("========================================");
  console.log("   HALALWISE KNOWLEDGE AUTOMATION");
  console.log("========================================");
  console.log("");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();

    console.log("✓ Connected to MongoDB.");

    const db = client.db(DB_NAME);
    const knowledgeCollection =
      db.collection("knowledge");

    const documents =
      await knowledgeCollection
        .find({})
        .toArray();

    console.log(
      `✓ Knowledge documents found: ${documents.length}`
    );

    if (documents.length === 0) {
      console.log(
        "No knowledge documents found."
      );

      return;
    }

    const seenKeys = new Map<string, string>();
    const duplicateIds: any[] = [];

    let validationPassed = 0;
    let validationFailed = 0;
    let verifiedSources = 0;
    let unverifiedSources = 0;
    let embeddingsCreated = 0;
    let embeddingsSkipped = 0;
    let documentsUpdated = 0;

    const extractor = await getExtractor();

    for (const document of documents) {
      console.log("");
      console.log(
        `Processing: ${document.title || "Untitled"}`
      );

      const errors = validateDocument(document);

      if (errors.length > 0) {
        validationFailed++;

        console.log(
          `✗ Validation failed: ${errors.join(", ")}`
        );

        continue;
      }

      validationPassed++;

      const category = normalizeCategory(
        document.category
      );

      const duplicateKey =
        getDuplicateKey(document);

      if (seenKeys.has(duplicateKey)) {
        console.log(
          `⚠ Duplicate detected: ${duplicateKey}`
        );

        duplicateIds.push(document._id);

        continue;
      }

      seenKeys.set(
        duplicateKey,
        String(document._id)
      );

      let source = null;

      if (document.sourceId) {
        source = await getVerifiedSource(
          db,
          document.sourceId
        );
      }

      const isVerified =
        document.verified === true &&
        (
          document.verificationStatus ===
            "verified" ||
          document.verificationStatus ===
            "active"
        );

      if (isVerified) {
        if (!source) {
          console.log(
            "✗ Verified document has no valid source."
          );

          validationFailed++;

          continue;
        }

        if (
          source.verified !== true ||
          (
            source.verificationStatus &&
            source.verificationStatus !==
              "verified"
          )
        ) {
          console.log(
            "✗ Linked source is not verified."
          );

          validationFailed++;

          continue;
        }

        verifiedSources++;

        console.log(
          "✓ Verified source confirmed."
        );
      } else {
        unverifiedSources++;

        console.log(
          "⚠ Document is not verified. It will not be trusted by RAG."
        );
      }

      const update: any = {
        category,
        embeddingModel:
          EMBEDDING_MODEL,
        embeddingDimensions:
          EMBEDDING_DIMENSIONS,
        updatedAt: new Date(),
      };

      const currentEmbedding =
        document.embedding;

      const embeddingIsValid =
        Array.isArray(currentEmbedding) &&
        currentEmbedding.length ===
          EMBEDDING_DIMENSIONS &&
        document.embeddingModel ===
          EMBEDDING_MODEL;

      if (embeddingIsValid) {
        embeddingsSkipped++;

        console.log(
          "✓ Existing embedding is valid."
        );
      } else {
        console.log(
          "Creating embedding..."
        );

        const text =
          buildEmbeddingText(document);

        const output = await extractor(
          text,
          {
            pooling: "mean",
            normalize: true,
          }
        );

        const embedding =
          Array.from(output.data);

        if (
          embedding.length !==
          EMBEDDING_DIMENSIONS
        ) {
          throw new Error(
            `Unexpected embedding dimensions: ${embedding.length}`
          );
        }

        update.embedding =
          embedding;

        update.embeddingModel =
          EMBEDDING_MODEL;

        update.embeddingDimensions =
          EMBEDDING_DIMENSIONS;

        update.embeddingUpdatedAt =
          new Date();

        embeddingsCreated++;

        console.log(
          "✓ Embedding created."
        );
      }

      await knowledgeCollection.updateOne(
        {
          _id: document._id,
        },
        {
          $set: update,
        }
      );

      documentsUpdated++;

      console.log(
        "✓ Knowledge document updated."
      );
    }

    console.log("");
    console.log("========================================");
    console.log("           AUTOMATION RESULT");
    console.log("========================================");
    console.log("");

    console.log(
      `Documents processed: ${documents.length}`
    );

    console.log(
      `Validation passed: ${validationPassed}`
    );

    console.log(
      `Validation failed: ${validationFailed}`
    );

    console.log(
      `Verified sources: ${verifiedSources}`
    );

    console.log(
      `Unverified documents: ${unverifiedSources}`
    );

    console.log(
      `Embeddings created: ${embeddingsCreated}`
    );

    console.log(
      `Embeddings already valid: ${embeddingsSkipped}`
    );

    console.log(
      `Documents updated: ${documentsUpdated}`
    );

    console.log(
      `Duplicates detected: ${duplicateIds.length}`
    );

    if (duplicateIds.length > 0) {
      console.log("");
      console.log(
        "⚠ Duplicate documents were NOT deleted."
      );
      console.log(
        "Review them with the duplicate detection script before removing anything."
      );
    }

    console.log("");
    console.log(
      "✓ Knowledge-base automation completed."
    );
    console.log("");
  } catch (error) {
    console.error("");
    console.error(
      "✗ Knowledge automation failed:"
    );
    console.error(error);
    console.error("");

    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();