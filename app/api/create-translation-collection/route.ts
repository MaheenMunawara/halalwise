import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const collections = await db
      .listCollections({ name: "translations" })
      .toArray();

    if (collections.length === 0) {
      await db.createCollection("translations");

      return NextResponse.json({
        success: true,
        message: "Translation collection created successfully 🕌",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Translation collection already exists 🕌",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create translation collection",
      },
      { status: 500 }
    );
  }
}