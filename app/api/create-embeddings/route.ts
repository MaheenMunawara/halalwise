
import { NextResponse } from "next/server";
import { pipeline } from "@huggingface/transformers";
import clientPromise from "@/lib/mongodb";

let extractor: any = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }

  return extractor;
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const now = new Date();

    const knowledge = [
      {
        category: "islamic-finance",

        title: "Prohibition of Riba",
        topic: "Riba",

        sourceType: "Quran",
        sourceName: "The Quran",
        sourceId: null,

        reference: "Surah Al-Baqarah 2:275-279",

        originalText: null,
        translation: null,
        language: "English",

        authorityLevel: "Primary",
        authenticity: "Quran",
        madhhab: "General",
        methodology: "Primary Islamic source",

        content:
          "Allah has permitted trade and forbidden riba. The Quran distinguishes lawful trade from riba and instructs believers to give up outstanding riba. Interest charged on loans is commonly discussed under the prohibition of riba in Islamic finance.",

        verified: true,
        verificationStatus: "verified",
        verifiedBy: "HalalWise source verification",
        verifiedAt: now,

        sourceUrl: null,
        attribution: null,
        license: null,

        createdAt: now,
        updatedAt: now,
      },

      {
        category: "islamic-finance",

        title: "Gharar",
        topic: "Gharar",

        sourceType: "Hadith / Islamic Jurisprudence",
        sourceName: "Islamic commercial law",
        sourceId: null,

        reference:
          "General principle concerning excessive uncertainty in transactions",

        originalText: null,
        translation: null,
        language: "English",

        authorityLevel: "Scholarly principle",
        authenticity: "Requires source-specific verification",
        madhhab: "General",
        methodology: "Islamic jurisprudence",

        content:
          "Gharar refers to excessive uncertainty or ambiguity in a transaction. Islamic commercial law generally prohibits transactions containing significant and avoidable uncertainty.",

        verified: true,
        verificationStatus: "verified",
        verifiedBy: "HalalWise source verification",
        verifiedAt: now,

        sourceUrl: null,
        attribution: null,
        license: null,

        createdAt: now,
        updatedAt: now,
      },

      {
        category: "quran",

        title: "Zakat",
        topic: "Worship",

        sourceType: "Quran",
        sourceName: "The Quran",
        sourceId: null,

        reference: "Surah Al-Baqarah 2:43",

        originalText: null,
        translation: null,
        language: "English",

        authorityLevel: "Primary",
        authenticity: "Quran",
        madhhab: "General",
        methodology: "Primary Islamic source",

        content:
          "Zakat is an obligatory act of worship and is mentioned repeatedly in the Quran alongside prayer.",

        verified: true,
        verificationStatus: "verified",
        verifiedBy: "HalalWise source verification",
        verifiedAt: now,

        sourceUrl: null,
        attribution: null,
        license: null,

        createdAt: now,
        updatedAt: now,
      },

      {
        category: "islamic-finance",

        title: "Halal Investing",
        topic: "Halal Investment",

        sourceType: "Islamic Finance Principles",
        sourceName: "Shariah investment principles",
        sourceId: null,

        reference: "General Shariah investment principles",

        originalText: null,
        translation: null,
        language: "English",

        authorityLevel: "Islamic finance",
        authenticity: "Standard-specific verification required",
        madhhab: "General",
        methodology: "Islamic finance",

        content:
          "Halal investing generally involves avoiding prohibited business activities and financial practices that conflict with Islamic principles. Screening standards can differ between scholars and Islamic finance organizations.",

        verified: true,
        verificationStatus: "verified",
        verifiedBy: "HalalWise source verification",
        verifiedAt: now,

        sourceUrl: null,
        attribution: null,
        license: null,

        createdAt: now,
        updatedAt: now,
      },
    ];

    // Create the embedding model once.
    const embeddingModel = await getExtractor();

    // Generate embeddings before inserting the documents.
    const documentsWithEmbeddings = [];

    for (const document of knowledge) {
      const text = [
        document.category,
        document.title,
        document.topic,
        document.content,
        document.reference,
      ]
        .filter(Boolean)
        .join(". ");

      const output = await embeddingModel(text, {
        pooling: "mean",
        normalize: true,
      });

      const embedding = Array.from(output.data);

      documentsWithEmbeddings.push({
        ...document,
        embedding,
        embeddingModel: "Xenova/all-MiniLM-L6-v2",
        embeddingDimensions: embedding.length,
        embeddingUpdatedAt: now,
      });
    }

    // Replace the current demo knowledge base.
    await db.collection("knowledge").deleteMany({});

    const result = await db
      .collection("knowledge")
      .insertMany(documentsWithEmbeddings);

    return NextResponse.json({
      success: true,
      message:
        "Knowledge base and embeddings updated successfully 🕌🧠",
      insertedCount: result.insertedCount,
      embeddingModel: "Xenova/all-MiniLM-L6-v2",
      embeddingDimensions: 384,
    });
  } catch (error) {
    console.error("Knowledge seed error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update knowledge base and embeddings",
      },
      {
        status: 500,
      }
    );
  }
}

