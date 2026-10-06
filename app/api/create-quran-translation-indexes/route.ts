import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const collection = db.collection("quran_translations");

    await collection.createIndex(
      {
        translationId: 1,
        surahNumber: 1,
        ayahNumber: 1,
      },
      {
        unique: true,
        name: "translation_verse_unique_index",
      }
    );

    await collection.createIndex(
      {
        surahNumber: 1,
        ayahNumber: 1,
      },
      {
        name: "quran_verse_lookup_index",
      }
    );

    return NextResponse.json({
      success: true,
      message: "Qur'an translation indexes created successfully 🕌",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create Qur'an translation indexes",
      },
      { status: 500 }
    );
  }
}