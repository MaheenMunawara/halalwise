import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const ayah = await db.collection("quran").findOne({
      surahNumber: 2,
      ayahNumber: 275,
    });

    if (!ayah) {
      return NextResponse.json(
        {
          success: false,
          message: "Qur'an 2:275 not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      reference: ayah.reference,
      arabicText: ayah.arabicText,
      arabicTextSource: ayah.arabicTextSource,
      arabicTextVersion: ayah.arabicTextVersion,
      verified: ayah.verified,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify Qur'an text",
      },
      { status: 500 }
    );
  }
}