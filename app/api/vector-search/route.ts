
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

export async function POST(request: Request) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Question is required",
        },
        { status: 400 }
      );
    }

    const cleanQuestion = question.trim();

    // Create embedding for the user's question.
    const embeddingModel = await getExtractor();

    const output = await embeddingModel(cleanQuestion, {
      pooling: "mean",
      normalize: true,
    });

    const queryVector = Array.from(output.data);

    // Connect to MongoDB.
    const client = await clientPromise;
    const db = client.db("halalwise");

    // Search the unified knowledge collection.
    const results = await db
      .collection("knowledge")
      .aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector,
            numCandidates: 20,
            limit: 5,
          },
        },
        {
          $project: {
            _id: 0,

            // Unified knowledge fields
            category: 1,
            title: 1,
            topic: 1,
            content: 1,

            // Source information
            sourceId: 1,
            sourceType: 1,
            sourceName: 1,
            reference: 1,
            sourceUrl: 1,

            // Authority and Islamic methodology
            authorityLevel: 1,
            authenticity: 1,
            methodology: 1,
            madhhab: 1,

            // Verification
            verified: 1,
            verificationStatus: 1,
            verifiedBy: 1,
            verifiedAt: 1,

            // Licensing / attribution
            attribution: 1,
            license: 1,

            // Embedding information
            embeddingModel: 1,
            embeddingDimensions: 1,

            score: {
              $meta: "vectorSearchScore",
            },
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      success: true,
      question: cleanQuestion,
      resultCount: results.length,
      results,
    });
  } catch (error) {
    console.error("Vector search error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Vector search failed",
      },
      { status: 500 }
    );
  }
}
