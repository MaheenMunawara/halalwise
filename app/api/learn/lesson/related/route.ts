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

    const lessonId = searchParams.get("lessonId")?.trim();

    if (!lessonId) {
      return NextResponse.json(
        {
          success: false,
          error: "Lesson ID is required.",
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
      .findOne(
        {
          id: lessonId,
          published: true,
        },
        {
          projection: {
            _id: 0,
            relatedLessonIds: 1,
          },
        }
      );

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

    const relatedLessonIds = Array.isArray(
      lesson.relatedLessonIds
    )
      ? lesson.relatedLessonIds
      : [];

    if (relatedLessonIds.length === 0) {
      return NextResponse.json({
        success: true,
        lessons: [],
      });
    }

    const lessons = await db
      .collection("learn_lessons")
      .find(
        {
          id: {
            $in: relatedLessonIds,
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

    return NextResponse.json({
      success: true,
      lessons,
    });
  } catch (error) {
    console.error(
      "Related lessons API failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Related lessons API failed.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}