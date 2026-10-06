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
      .find({
        userId,
        completed: true,
      })
      .sort({
        updatedAt: -1,
      })
      .toArray();

    if (completedProgress.length === 0) {
      return NextResponse.json({
        success: true,
        lessons: [],
      });
    }

    const lessonIds = completedProgress.map(
      (item) => item.lessonId
    );

    const lessons = await db
      .collection("learn_lessons")
      .find(
        {
          id: {
            $in: lessonIds,
          },
          published: true,
        },
        {
          projection: {
            _id: 0,
            id: 1,
            categoryId: 1,
            title: 1,
            slug: 1,
            description: 1,
            difficulty: 1,
            estimatedMinutes: 1,
          },
        }
      )
      .toArray();

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
          },
        }
      )
      .toArray();

    const categoryMap = new Map(
      categories.map((category) => [
        category.id,
        category,
      ])
    );

    const progressMap = new Map(
      completedProgress.map((progress) => [
        progress.lessonId,
        progress,
      ])
    );

    const completedLessons = lessons
      .map((lesson) => {
        const progress = progressMap.get(lesson.id);
        const category = categoryMap.get(
          lesson.categoryId
        );

        return {
          ...lesson,
          category: category
            ? {
                id: category.id,
                name: category.name,
                slug: category.slug,
              }
            : null,
          completed: true,
          completedAt: progress?.updatedAt || null,
        };
      })
      .sort((a, b) => {
        const aDate = a.completedAt
          ? new Date(a.completedAt).getTime()
          : 0;

        const bDate = b.completedAt
          ? new Date(b.completedAt).getTime()
          : 0;

        return bDate - aDate;
      });

    return NextResponse.json({
      success: true,
      lessons: completedLessons,
    });
  } catch (error) {
    console.error(
      "Completed lessons API failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to retrieve completed lessons.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}