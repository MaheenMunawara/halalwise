import { NextResponse } from "next/server";
import { pipeline } from "@huggingface/transformers";
import clientPromise from "@/lib/mongodb";

let extractor: any = null;
let generator: any = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }

  return extractor;
}

async function getGenerator() {
  if (!generator) {
    generator = await pipeline(
      "text-generation",
      "HuggingFaceTB/SmolLM2-360M-Instruct"
    );
  }

  return generator;
}

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function splitIntoClaims(text: string) {
  return text
    .split(/[.!?]+/)
    .map((claim) => claim.trim())
    .filter((claim) => claim.length > 10);
}

export async function POST(request: Request) {
  try {
    const { question } = await request.json();

    if (!question?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Question is required",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // STEP 1: Create question embedding
    // --------------------------------------------------

    const embeddingModel = await getExtractor();

    const questionOutput = await embeddingModel(question, {
      pooling: "mean",
      normalize: true,
    });

    const queryVector = Array.from(questionOutput.data);

    // --------------------------------------------------
    // STEP 2: Search verified knowledge base
    // --------------------------------------------------

    const client = await clientPromise;
    const db = client.db("halalwise");

    const knowledge = await db
      .collection("knowledge")
      .aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector,
            numCandidates: 20,
            limit: 3,
          },
        },
        {
          $project: {
            _id: 0,

            title: 1,
            topic: 1,

            sourceId: 1,

            sourceType: 1,
            sourceName: 1,

            reference: 1,

            authorityLevel: 1,
            authenticity: 1,
            madhhab: 1,

            content: 1,

            methodology: 1,

            verified: 1,
            verifiedBy: 1,
            verifiedAt: 1,

            embedding: 1,

            score: {
              $meta: "vectorSearchScore",
            },
          },
        },
      ])
      .toArray();

    // --------------------------------------------------
    // STEP 3: Select strongest verified source
    // --------------------------------------------------

    const relevantKnowledge = knowledge
      .filter(
        (item) =>
          item.score >= 0.65 &&
          item.verified === true
      )
      .slice(0, 1);

    // --------------------------------------------------
    // STEP 4: No verified source
    // --------------------------------------------------

    if (relevantKnowledge.length === 0) {
      return NextResponse.json({
        success: true,
        question,

        answer:
          "I don't have enough verified information in the HalalWise knowledge base to answer this reliably.",

        sources: [],
      });
    }

    const bestSource = relevantKnowledge[0];

    // --------------------------------------------------
    // STEP 4.1: Get linked authoritative source
    // --------------------------------------------------

    const linkedSource = await db.collection("sources").findOne({
      _id: bestSource.sourceId,
    });

    if (!linkedSource) {
      return NextResponse.json({
        success: false,
        message: "Linked source not found.",
      });
    }

    // --------------------------------------------------
    // STEP 5: Build verified context
    // --------------------------------------------------

    const context = `
Title: ${bestSource.title}
Topic: ${bestSource.topic}

Source Type: ${linkedSource.sourceType}
Source Name: ${linkedSource.sourceName}

Reference: ${linkedSource.reference}

Authority Level: ${linkedSource.authorityLevel}
Authenticity: ${linkedSource.authenticity}
Madhhab: ${linkedSource.madhhab}

Methodology: ${bestSource.methodology}

Verified: ${linkedSource.verified}

Content:
${bestSource.content}
`;

    // --------------------------------------------------
    // STEP 6: Generate answer
    // --------------------------------------------------

    const model = await getGenerator();

    const prompt = `
You are a text simplification assistant for HalalWise.

You are NOT a scholar.
You must NOT issue a fatwa.

Your ONLY task is to simplify the VERIFIED SOURCE.

STRICT RULES:

1. Use ONLY information contained in the VERIFIED SOURCE.
2. Do not use your own knowledge.
3. Do not add reasons that are not explicitly present.
4. Do not add Quran verses or Hadith.
5. Do not add scholars or scholarly opinions.
6. Do not add examples.
7. Do not add new rulings.
8. Do not change the meaning.
9. Keep the answer to 1 or 2 short sentences.
10. Plain text only.
11. No markdown.
12. No JSON.

VERIFIED SOURCE:

${context}

USER QUESTION:

${question}

Answer using ONLY the VERIFIED SOURCE.
`;

    const generated = await model(
      [
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        max_new_tokens: 80,
      }
    );

    let answer =
      generated?.[0]?.generated_text?.at(-1)?.content?.trim() || "";

    console.log("Raw AI response:", answer);

    // --------------------------------------------------
    // STEP 7: Clean formatting
    // --------------------------------------------------

    answer = answer
      .replace(/^```[a-zA-Z]*\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    if (
      answer.startsWith('"') &&
      answer.endsWith('"')
    ) {
      answer = answer.slice(1, -1);
    }

    // --------------------------------------------------
    // STEP 8: Claim-level verification
    // --------------------------------------------------

    const claims = splitIntoClaims(answer);

    const sourceOutput = await embeddingModel(
      bestSource.content,
      {
        pooling: "mean",
        normalize: true,
      }
    );

    const sourceVector = Array.from(sourceOutput.data);

    const claimResults = [];

    for (const claim of claims) {
      const claimOutput = await embeddingModel(
        claim,
        {
          pooling: "mean",
          normalize: true,
        }
      );

      const claimVector = Array.from(claimOutput.data);

      const claimScore = cosineSimilarity(
        claimVector,
        sourceVector
      );

      claimResults.push({
        claim,
        score: claimScore,
        supported: claimScore >= 0.68,
      });
    }

    console.log(
      "Claim verification:",
      claimResults
    );

    // --------------------------------------------------
    // STEP 9: Determine whether ALL claims are supported
    // --------------------------------------------------

    const allClaimsSupported =
      claims.length > 0 &&
      claimResults.every(
        (claim) => claim.supported
      );

    // --------------------------------------------------
    // STEP 10: Safety fallback
    // --------------------------------------------------

    let usedFallback = false;

    if (!allClaimsSupported) {
      console.log(
        "One or more AI claims were not sufficiently supported."
      );

      answer = bestSource.content;
      usedFallback = true;
    }

    // --------------------------------------------------
    // STEP 11: Linked source metadata
    // --------------------------------------------------

    const sources = [
      {
        title: bestSource.title,
        topic: bestSource.topic,

        sourceId: linkedSource._id,

        sourceType: linkedSource.sourceType,
        sourceName: linkedSource.sourceName,

        reference: linkedSource.reference,

        authorityLevel: linkedSource.authorityLevel,
        authenticity: linkedSource.authenticity,
        madhhab: linkedSource.madhhab,

        methodology: bestSource.methodology,

        verified: linkedSource.verified,
        verifiedBy: linkedSource.verifiedBy,
        verifiedAt: linkedSource.verifiedAt,

        score: bestSource.score,

        claimVerification: claimResults,

        allClaimsSupported,
        usedFallback,
      },
    ];

    // --------------------------------------------------
    // STEP 12: Final response
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      question,
      answer,
      sources,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "RAG test failed",
      },
      { status: 500 }
    );
  }
}