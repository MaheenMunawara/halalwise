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

    const categorySlug = searchParams.get("category")?.trim();
    const lessonSlug = searchParams.get("lesson")?.trim();

    if (!categorySlug || !lessonSlug) {
      return NextResponse.json(
        {
          success: false,
          error: "Category and lesson are required.",
        },
        { status: 400 }
      );
    }

    await client.connect();

    const db = client.db("halalwise");

    const category = await db
      .collection("learn_categories")
      .findOne(
        {
          slug: categorySlug,
          published: true,
        },
        {
          projection: {
            _id: 0,
          },
        }
      );

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: "Learn category not found.",
        },
        { status: 404 }
      );
    }

    const lesson = await db
      .collection("learn_lessons")
      .findOne(
        {
          categoryId: category.id,
          slug: lessonSlug,
          published: true,
        },
        {
          projection: {
            _id: 0,
          },
        }
      );

    if (!lesson) {
      return NextResponse.json(
        {
          success: false,
          error: "Learn lesson not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
      lesson,
    });
  } catch (error) {
    console.error("Learn lesson API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Learn lesson API failed.",
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}