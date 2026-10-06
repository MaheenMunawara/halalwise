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
    const collection = db.collection("finance_companies");

    const indexes = [
      {
        key: { ticker: 1 },
        name: "ticker_unique",
        unique: true,
      },
      {
        key: { companyName: 1 },
        name: "company_name_index",
      },
      {
        key: { screeningResult: 1 },
        name: "screening_result_index",
      },
      {
        key: { sector: 1 },
        name: "sector_index",
      },
    ];

    await collection.createIndexes(indexes);

    return NextResponse.json({
      success: true,
      message: "Halal Finance collection is ready.",
      collection: "finance_companies",
      indexesCreated: indexes.map(
        (index) => index.name
      ),
    });
  } catch (error) {
    console.error(
      "Finance collection setup failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create Halal Finance collection.",
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}

export async function POST() {
  return GET();
}