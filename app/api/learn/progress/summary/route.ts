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

    const totalLessons = await db
      .collection("learn_lessons")
      .countDocuments({
        published: true,
      });

    const completedLessons = await db
      .collection("learn_progress")
      .countDocuments({
        userId,
        completed: true,
      });

    const remainingLessons = Math.max(
      totalLessons - completedLessons,
      0
    );

    const progressPercentage =
      totalLessons > 0
        ? Math.round(
            (completedLessons / totalLessons) * 100
          )
        : 0;

    const recentProgress = await db
      .collection("learn_progress")
      .find({
        userId,
        completed: true,
      })
      .sort({
        updatedAt: -1,
      })
      .limit(5)
      .toArray();

    return NextResponse.json({
      success: true,
      summary: {
        totalLessons,
        completedLessons,
        remainingLessons,
        progressPercentage,
      },
      recentProgress: recentProgress.map(
        (item) => ({
          lessonId: item.lessonId,
          completed: item.completed,
          updatedAt: item.updatedAt,
        })
      ),
    });
  } catch (error) {
    console.error(
      "Learn progress summary failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve Learn progress summary.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}