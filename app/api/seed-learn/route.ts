import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

export async function GET() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db("halalwise");

    const categories = db.collection("learn_categories");
    const lessons = db.collection("learn_lessons");

    await categories.createIndex(
      { id: 1 },
      {
        name: "category_id_unique",
        unique: true,
      }
    );

    await categories.createIndex(
      { slug: 1 },
      {
        name: "category_slug_unique",
        unique: true,
      }
    );

    await categories.createIndex(
      { order: 1 },
      {
        name: "category_order_index",
      }
    );

    await categories.createIndex(
      { published: 1 },
      {
        name: "category_published_index",
      }
    );

    await lessons.createIndex(
      { id: 1 },
      {
        name: "lesson_id_unique",
        unique: true,
      }
    );

    await lessons.createIndex(
      { slug: 1 },
      {
        name: "lesson_slug_index",
      }
    );

    await lessons.createIndex(
      { categoryId: 1 },
      {
        name: "lesson_category_index",
      }
    );

    await lessons.createIndex(
      { order: 1 },
      {
        name: "lesson_order_index",
      }
    );

    await lessons.createIndex(
      { published: 1 },
      {
        name: "lesson_published_index",
      }
    );

    return NextResponse.json({
      success: true,
      message: "Learn collections are ready.",
      collections: [
        "learn_categories",
        "learn_lessons",
      ],
      indexesCreated: [
        "category_id_unique",
        "category_slug_unique",
        "category_order_index",
        "category_published_index",
        "lesson_id_unique",
        "lesson_slug_index",
        "lesson_category_index",
        "lesson_order_index",
        "lesson_published_index",
      ],
    });
  } catch (error) {
    console.error(
      "Learn collection setup failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Learn collection setup failed.",
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}