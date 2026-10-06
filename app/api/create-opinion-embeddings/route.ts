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

    const opinions = await db
      .collection("opinions")
      .find({})
      .toArray();

    if (opinions.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No opinions found.",
      });
    }

    const embeddingModel = await getExtractor();

    let updatedCount = 0;

    for (const opinion of opinions) {
      const text = `
        Topic: ${opinion.topic}
        Question: ${opinion.question}
        Ruling: ${opinion.ruling}
        Authority: ${opinion.authority}
        Madhhab: ${opinion.madhhab}
        Conditions: ${opinion.conditions?.join(". ")}
      `;

      const output = await embeddingModel(text, {
        pooling: "mean",
        normalize: true,
      });

      const embedding = Array.from(output.data);

      await db.collection("opinions").updateOne(
        { _id: opinion._id },
        {
          $set: {
            embedding,
          },
        }
      );

      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: "Opinion embeddings created successfully 🧠",
      updatedCount,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create opinion embeddings",
      },
      {
        status: 500,
      }
    );
  }
}