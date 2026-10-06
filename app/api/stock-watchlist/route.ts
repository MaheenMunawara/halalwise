import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStockWatchlistCollection } from "@/lib/stockWatchlist";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const userId =
      session.user.email.toLowerCase();

    const collection =
      await getStockWatchlistCollection();

    const watchlist = await collection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      watchlist: watchlist.map((item) => ({
        id: item._id.toString(),
        symbol: item.symbol,
        companyName: item.companyName,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error(
      "Failed to load stock watchlist:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load stock watchlist.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const symbol = String(
      body.symbol || ""
    )
      .trim()
      .toUpperCase();

    const companyName = String(
      body.companyName || ""
    ).trim();

    if (!symbol || !companyName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Stock symbol and company name are required.",
        },
        { status: 400 }
      );
    }

    if (symbol.length > 20) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid stock symbol.",
        },
        { status: 400 }
      );
    }

    if (companyName.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: "Company name is too long.",
        },
        { status: 400 }
      );
    }

    const userId =
      session.user.email.toLowerCase();

    const collection =
      await getStockWatchlistCollection();

    const existing = await collection.findOne({
      userId,
      symbol,
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadySaved: true,
        message: "Stock is already in your watchlist.",
      });
    }

    const result = await collection.insertOne({
      userId,
      symbol,
      companyName,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      alreadySaved: false,
      id: result.insertedId.toString(),
    });
  } catch (error) {
    console.error(
      "Failed to save stock:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save stock.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid stock ID is required.",
        },
        { status: 400 }
      );
    }

    const userId =
      session.user.email.toLowerCase();

    const collection =
      await getStockWatchlistCollection();

    const result =
      await collection.deleteOne({
        _id: new ObjectId(id),
        userId,
      });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Stock not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Failed to remove stock:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove stock.",
      },
      { status: 500 }
    );
  }
}