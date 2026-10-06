import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

export async function GET(
  request: Request
) {
  const client = new MongoClient(uri);

  try {
    const { searchParams } =
      new URL(request.url);

    const query =
      searchParams.get("q")?.trim() || "";

    if (!query) {
      return NextResponse.json({
        success: true,
        stocks: [],
      });
    }

    await client.connect();

    const db = client.db("halalwise");

    const stocks = await db
      .collection("finance_companies")
      .find(
        {
          $or: [
            {
              ticker: {
                $regex: query,
                $options: "i",
              },
            },
            {
              companyName: {
                $regex: query,
                $options: "i",
              },
            },
          ],
        },
        {
          projection: {
            _id: 0,
            companyName: 1,
            ticker: 1,
            exchange: 1,
            sector: 1,
          },
        }
      )
      .limit(10)
      .toArray();

    return NextResponse.json({
      success: true,
      stocks,
    });
  } catch (error) {
    console.error(
      "Stock search failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Stock search failed.",
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}