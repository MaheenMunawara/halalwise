import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

export async function GET(request: Request) {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db("halalwise");

    const { searchParams } = new URL(request.url);

    const slug = searchParams.get("slug")?.trim();

    if (slug) {
      const category = await db
        .collection("learn_categories")
        .findOne(
          {
            slug,
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
          {
            status: 404,
          }
        );
      }

      const lessons = await db
        .collection("learn_lessons")
        .find(
          {
            categoryId: category.id,
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
              order: 1,
              estimatedMinutes: 1,
            },
          }
        )
        .sort({
          order: 1,
        })
        .toArray();

      return NextResponse.json({
        success: true,
        category,
        lessons,
      });
    }

    const categories = await db
      .collection("learn_categories")
      .find(
        {
          published: true,
        },
        {
          projection: {
            _id: 0,
          },
        }
      )
      .sort({
        order: 1,
      })
      .toArray();

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error(
      "Learn API failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Learn API failed.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}