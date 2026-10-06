import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

export async function GET(request: Request) {
  const client = new MongoClient(uri);

  try {
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId")?.trim();
    const lessonId = searchParams.get("lessonId")?.trim();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "userId is required.",
        },
        {
          status: 400,
        }
      );
    }

    await client.connect();

    const db = client.db("halalwise");

    if (lessonId) {
      const progress = await db
        .collection("learn_progress")
        .findOne(
          {
            userId,
            lessonId,
          },
          {
            projection: {
              _id: 0,
            },
          }
        );

      return NextResponse.json({
        success: true,
        progress: progress || null,
      });
    }

    const progress = await db
      .collection("learn_progress")
      .find(
        {
          userId,
        },
        {
          projection: {
            _id: 0,
          },
        }
      )
      .sort({
        updatedAt: -1,
      })
      .toArray();

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error(
      "Learn progress GET failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve Learn progress.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}

export async function POST(request: Request) {
  const client = new MongoClient(uri);

  try {
    const body = await request.json();

    const userId =
      typeof body?.userId === "string"
        ? body.userId.trim()
        : "";

    const lessonId =
      typeof body?.lessonId === "string"
        ? body.lessonId.trim()
        : "";

    const completed =
      typeof body?.completed === "boolean"
        ? body.completed
        : false;

    if (!userId || !lessonId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "userId and lessonId are required.",
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

    const now = new Date();

    await db.collection("learn_progress").updateOne(
      {
        userId,
        lessonId,
      },
      {
        $set: {
          userId,
          lessonId,
          completed,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      {
        upsert: true,
      }
    );

    const progress = await db
      .collection("learn_progress")
      .findOne(
        {
          userId,
          lessonId,
        },
        {
          projection: {
            _id: 0,
          },
        }
      );

    return NextResponse.json({
      success: true,
      message: "Learn progress saved.",
      progress,
    });
  } catch (error) {
    console.error(
      "Learn progress POST failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save Learn progress.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}