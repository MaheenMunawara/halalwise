import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const collections = await db
      .listCollections({ name: "quran_translations" })
      .toArray();

    if (collections.length === 0) {
      await db.createCollection("quran_translations");

      return NextResponse.json({
        success: true,
        message: "Qur'an translations collection created successfully 🕌",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Qur'an translations collection already exists 🕌",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create Qur'an translations collection",
      },
      { status: 500 }
    );
  }
}