import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const indexes = await db
      .collection("quran_translations")
      .listIndexes()
      .toArray();

    return NextResponse.json({
      success: true,
      collection: "quran_translations",
      indexes,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify Qur'an translation indexes",
      },
      { status: 500 }
    );
  }
}