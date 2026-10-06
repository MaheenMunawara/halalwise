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

    const collectionName = "learn_progress";

    const collections = await db
      .listCollections({
        name: collectionName,
      })
      .toArray();

    if (collections.length === 0) {
      await db.createCollection(collectionName);
    }

    const collection = db.collection(collectionName);

    await collection.createIndex(
      {
        userId: 1,
        lessonId: 1,
      },
      {
        unique: true,
        name: "progress_user_lesson_unique",
      }
    );

    await collection.createIndex(
      {
        userId: 1,
      },
      {
        name: "progress_user_index",
      }
    );

    await collection.createIndex(
      {
        lessonId: 1,
      },
      {
        name: "progress_lesson_index",
      }
    );

    return NextResponse.json({
      success: true,
      message: "Learn progress collection is ready.",
    });
  } catch (error) {
    console.error(
      "Seed learn progress failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create Learn progress collection.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}