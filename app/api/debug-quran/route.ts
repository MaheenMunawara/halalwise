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

    const collections = await db
      .listCollections()
      .toArray();

    const result = [];

    for (const collection of collections) {
      const name = collection.name;

      const count = await db
        .collection(name)
        .countDocuments();

      const sample = await db
        .collection(name)
        .find({})
        .limit(1)
        .toArray();

      result.push({
        collection: name,
        count,
        sample,
      });
    }

    return NextResponse.json({
      success: true,
      collections: result,
    });
  } catch (error) {
    console.error("Debug database API failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to inspect database.",
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}