import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { learnCategories } from "../learn/categories";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

export async function GET() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db("halalwise");

    const collection = db.collection("learn_categories");

    const now = new Date();

    for (const category of learnCategories) {
      await collection.updateOne(
        {
          id: category.id,
        },
        {
          $set: {
            ...category,
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
    }

    return NextResponse.json({
      success: true,
      message: "Learn categories seeded successfully.",
      count: learnCategories.length,
      categories: learnCategories.map(
        (category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
        })
      ),
    });
  } catch (error) {
    console.error(
      "Learn category seeding failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Learn category seeding failed.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}