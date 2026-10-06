import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const translations = await db
      .collection("translations")
      .find({})
      .toArray();

    return NextResponse.json({
      success: true,
      count: translations.length,
      translations,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify translations",
      },
      { status: 500 }
    );
  }
}