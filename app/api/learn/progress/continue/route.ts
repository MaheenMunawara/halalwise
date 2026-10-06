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

    const completedProgress = await db
      .collection("learn_progress")
      .find(
        {
          userId,
          completed: true,
        },
        {
          projection: {
            _id: 0,
            lessonId: 1,
          },
        }
      )
      .toArray();

    const completedLessonIds = completedProgress.map(
      (item) => item.lessonId
    );

    const categories = await db
      .collection("learn_categories")
      .find(
        {
          published: true,
        },
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            slug: 1,
            order: 1,
          },
        }
      )
      .sort({
        order: 1,
      })
      .toArray();

    for (const category of categories) {
      const nextLesson = await db
        .collection("learn_lessons")
        .findOne(
          {
            categoryId: category.id,
            published: true,
            id: {
              $nin: completedLessonIds,
            },
          },
          {
            projection: {
              _id: 0,
              id: 1,
              title: 1,
              slug: 1,
              description: 1,
              categoryId: 1,
              order: 1,
            },
            sort: {
              order: 1,
            },
          }
        );

      if (nextLesson) {
        return NextResponse.json({
          success: true,
          continueLearning: {
            lesson: nextLesson,
            category: {
              id: category.id,
              name: category.name,
              slug: category.slug,
            },
            completed: false,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      continueLearning: null,
      message: "All available lessons are completed.",
    });
  } catch (error) {
    console.error(
      "Continue learning API failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to retrieve next learning lesson.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}