import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

export async function POST(request: Request) {
  const client = new MongoClient(uri);

  try {
    const body = await request.json();

    const lessonId =
      typeof body?.lessonId === "string"
        ? body.lessonId.trim()
        : "";

    const sourceId =
      typeof body?.sourceId === "string"
        ? body.sourceId.trim()
        : "";

    if (!lessonId || !sourceId) {
      return NextResponse.json(
        {
          success: false,
          error: "lessonId and sourceId are required.",
        },
        {
          status: 400,
        }
      );
    }

    await client.connect();

    const db = client.db("halalwise");

    const lesson = await db
      .collection("learn_lessons")
      .findOne({
        id: lessonId,
        published: true,
      });

    if (!lesson) {
      return NextResponse.json(
        {
          success: false,
          error: "Lesson not found.",
        },
        {
          status: 404,
        }
      );
    }

    let source = null;

    if (ObjectId.isValid(sourceId)) {
      source = await db
        .collection("sources")
        .findOne({
          _id: new ObjectId(sourceId),
          verified: true,
          verificationStatus: "verified",
        });
    }

    if (!source) {
      source = await db
        .collection("sources")
        .findOne({
          id: sourceId,
          verified: true,
          verificationStatus: "verified",
        });
    }

    if (!source) {
      return NextResponse.json(
        {
          success: false,
          error: "Verified source not found.",
        },
        {
          status: 404,
        }
      );
    }

    const actualSourceId = source.id || source._id.toString();

    await db.collection("learn_lessons").updateOne(
      {
        id: lessonId,
      },
      {
        $addToSet: {
          sourceIds: actualSourceId,
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Verified source connected to lesson.",
      lessonId,
      sourceId: actualSourceId,
    });
  } catch (error) {
    console.error(
      "Connect lesson source failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect source to lesson.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}