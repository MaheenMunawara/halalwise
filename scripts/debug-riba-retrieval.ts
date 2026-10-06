import dotenv from "dotenv";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { pipeline } from "@xenova/transformers";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

const client = new MongoClient(uri);

async function main() {
  await client.connect();

  console.log("Connected to MongoDB.");

  const db = client.db("halalwise");

  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  const question = "What does Islam say about riba?";

  const output = await extractor(question, {
    pooling: "mean",
    normalize: true,
  });

  const queryEmbedding = Array.from(output.data);

  console.log(
    "Query embedding dimensions:",
    queryEmbedding.length
  );

  const results = await db
    .collection("knowledge")
    .aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: 10,
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          category: 1,
          topic: 1,
          content: 1,
          sourceId: 1,
          verified: 1,
          verificationStatus: 1,
          collection: 1,
          hadithNumber: 1,
          authenticity: 1,
          embeddingModel: 1,
          embeddingDimensions: 1,
          score: {
            $meta: "vectorSearchScore",
          },
        },
      },
    ])
    .toArray();

  console.log("");
  console.log("VECTOR SEARCH RESULTS");
  console.log("=====================");

  for (const item of results) {
    console.log("");
    console.log("Title:", item.title);
    console.log("Category:", item.category);
    console.log("Topic:", item.topic);
    console.log("Collection:", item.collection);
    console.log("Hadith number:", item.hadithNumber);
    console.log("Authenticity:", item.authenticity);
    console.log("Verified:", item.verified);
    console.log(
      "Verification status:",
      item.verificationStatus
    );
    console.log("Raw score:", item.score);
    console.log("Source ID:", item.sourceId);
    console.log(
      "Embedding model:",
      item.embeddingModel
    );
    console.log(
      "Embedding dimensions:",
      item.embeddingDimensions
    );

    if (
      item.category === "hadith" &&
      item.collection === "Sahih Muslim" &&
      String(item.hadithNumber) === "1598"
    ) {
      console.log(
        ">>> THIS IS SAHIH MUSLIM 1598 <<<"
      );
    }
  }

  const hadith = await db.collection("knowledge").findOne({
    category: "hadith",
    collection: "Sahih Muslim",
    hadithNumber: "1598",
  });

  console.log("");
  console.log("DIRECT DATABASE CHECK");
  console.log("=====================");

  if (!hadith) {
    console.log(
      "❌ Sahih Muslim 1598 was NOT found in knowledge."
    );
  } else {
    console.log(
      "✓ Sahih Muslim 1598 exists in knowledge."
    );

    console.log("ID:", hadith._id);
    console.log("Topic:", hadith.topic);
    console.log("Verified:", hadith.verified);
    console.log(
      "Verification status:",
      hadith.verificationStatus
    );
    console.log(
      "Embedding dimensions:",
      Array.isArray(hadith.embedding)
        ? hadith.embedding.length
        : "NO EMBEDDING"
    );

    console.log(
      "Source ID:",
      hadith.sourceId
    );

    let source = null;

    if (
      hadith.sourceId instanceof ObjectId
    ) {
      source = await db
        .collection("sources")
        .findOne({
          _id: hadith.sourceId,
        });
    } else if (
      typeof hadith.sourceId === "string"
    ) {
      source = await db
        .collection("sources")
        .findOne({
          _id: hadith.sourceId,
        });

      if (!source && ObjectId.isValid(hadith.sourceId)) {
        source = await db
          .collection("sources")
          .findOne({
            _id: new ObjectId(
              hadith.sourceId
            ),
          });
      }
    }

    console.log(
      "Verified source found:",
      Boolean(source)
    );

    if (source) {
      console.log(
        "Source verified:",
        source.verified
      );
      console.log(
        "Source name:",
        source.sourceName
      );
    }
  }

  await client.close();
}

main().catch((error) => {
  console.error("");
  console.error("DEBUG FAILED");
  console.error(error);
  process.exit(1);
});