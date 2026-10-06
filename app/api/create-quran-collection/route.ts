import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const collections = await db
      .listCollections({ name: "quran" })
      .toArray();

    if (collections.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Qur'an collection already exists 🕌",
      });
    }

    await db.createCollection("quran");

    return NextResponse.json({
      success: true,
      message: "Qur'an collection created successfully 🕌",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create Qur'an collection",
      },
      { status: 500 }
    );
  }
}