import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const record = await db.collection("quran").findOne({
      surahNumber: 2,
      ayahNumber: 275,
    });

    if (!record) {
      return NextResponse.json(
        {
          success: false,
          message: "Qur'an 2:275 record not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      reference: record.reference,
      translations: record.translations,
      verified: record.verified,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify Qur'an translation metadata",
      },
      { status: 500 }
    );
  }
}