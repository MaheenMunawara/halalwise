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


if (!question) {
  return NextResponse.json(
    {
      success: false,
      message: "Question is required.",
    },
    { status: 400 }
  );
}

const client = await clientPromise;
const db = client.db("halalwise");

const embeddingModel = await getExtractor();

const output = await embeddingModel(question, {
  pooling: "mean",
  normalize: true,
});

const queryVector = Array.from(output.data);

const opinions = await db
  .collection("opinions")
  .aggregate([
    {
      $vectorSearch: {
        index: "opinion_vector_index",
        path: "embedding",
        queryVector,
        numCandidates: 20,
        limit: 3,
      },
    },
    {
      $project: {
        _id: 1,
        topic: 1,
        question: 1,
        ruling: 1,
        opinionType: 1,
        authority: 1,
        authorityType: 1,
        scholar: 1,
        madhhab: 1,
        conditions: 1,
        sourceId: 1,
        sourceType: 1,
        reference: 1,
        authorityLevel: 1,
        verified: 1,
        verifiedBy: 1,
        methodology: 1,
        score: {
          $meta: "vectorSearchScore",
        },
      },
    },
  ])
  .toArray();

const normalizedQuestion = question.toLowerCase();

let requestedAuthority: string | null = null;
let requestedMadhhab: string | null = null;

if (normalizedQuestion.includes("hanafi")) {
  requestedMadhhab = "Hanafi";
} else if (normalizedQuestion.includes("shafi")) {
  requestedMadhhab = "Shafi'i";
} else if (normalizedQuestion.includes("maliki")) {
  requestedMadhhab = "Maliki";
} else if (normalizedQuestion.includes("hanbali")) {
  requestedMadhhab = "Hanbali";
}

if (normalizedQuestion.includes("aaoifi")) {
  requestedAuthority = "AAOIFI";
} else if (
  normalizedQuestion.includes("iifa") ||
  normalizedQuestion.includes("international islamic fiqh academy")
) {
  requestedAuthority = "IIFA";
}

const verifiedOpinions = opinions
  .filter(
    (opinion) =>
      opinion.score >= 0.65 &&
      opinion.verified === true
  )
  .filter((opinion) => {
  if (requestedAuthority) {
    if (requestedAuthority === "AAOIFI") {
      if (!opinion.authority.includes("AAOIFI")) {
        return false;
      }
    }

    if (requestedAuthority === "IIFA") {
      if (
        opinion.authority !==
        "International Islamic Fiqh Academy"
      ) {
        return false;
      }
    }
  }

  if (requestedMadhhab) {
    return opinion.madhhab === requestedMadhhab;
  }

  return true;
})
  .slice(0, 3);

const opinionsWithSources = [];

for (const opinion of verifiedOpinions) {
  const source = await db.collection("sources").findOne({
    _id: opinion.sourceId,
  });

  opinionsWithSources.push({
    ...opinion,
    source: source
      ? {
          sourceId: source._id,
          sourceType: source.sourceType,
          sourceName: source.sourceName,
          reference: source.reference,
          sourceCategory: source.sourceCategory,
          authorityLevel: source.authorityLevel,
          authenticity: source.authenticity,
          madhhab: source.madhhab,
          verified: source.verified,
          verifiedBy: source.verifiedBy,
          verifiedAt: source.verifiedAt,
        }
      : null,
  });
}

const commonPoints: string[] = [];
const differences: string[] = [];
const scopeStatements: string[] = [];

if (opinionsWithSources.length >= 2) {
  const allConditions = opinionsWithSources.flatMap(
    (opinion: any) => opinion.conditions || []
  );

  const permissionConditions = allConditions.filter(
    (condition: string) =>
      condition.toLowerCase().includes("permissible")
  );

  if (permissionConditions.length >= 2) {
    commonPoints.push(
      "The retrieved opinions both condition permissibility on the underlying company's purpose or objectives being Shariah-permissible."
    );
  }

  for (const opinion of opinionsWithSources) {
    const authority = opinion.authority;
    const ruling = opinion.ruling.toLowerCase();

    if (
      authority === "International Islamic Fiqh Academy" &&
      ruling.includes("establishing") &&
      ruling.includes("participating")
    ) {
      scopeStatements.push(
        "IIFA: The retrieved resolution addresses establishing and participating in joint-stock companies whose purposes and activities are permissible."
      );
    }

    if (
      authority.includes("AAOIFI") &&
      ruling.includes("issuance of shares")
    ) {
      scopeStatements.push(
        "AAOIFI: The retrieved Shariah Standard addresses the permissibility of issuing shares when the corporation's objectives are permissible."
      );
    }
  }

  if (scopeStatements.length >= 2) {
    differences.push(
      "The retrieved statements address different aspects of share-related activity rather than establishing a direct contradiction."
    );
  }
}

const comparison = {
  commonPoints,
  differences,
  scopeStatements,

  caution:
    opinionsWithSources.length === 0
      ? "No verified scholarly opinions were found, so there is nothing to compare."
      : opinionsWithSources.length === 1
      ? "Only one verified scholarly opinion was found, so a comparison cannot be made."
      : "These are separate institutional opinions. The comparison identifies shared themes and differences in scope; it does not create a new combined ruling.",
};

return NextResponse.json({
  success: true,
  question,

  message:
    opinionsWithSources.length === 0
      ? "No verified scholarly opinion was found in the current HalalWise knowledge base for this question."
      : "Verified scholarly opinions found.",

  opinions: opinionsWithSources,
  comparison,
});

} catch (error) {
console.error(error);


return NextResponse.json(
  {
    success: false,
    message: "Failed to search scholarly opinions.",
  },
  { status: 500 }
);


}
}
