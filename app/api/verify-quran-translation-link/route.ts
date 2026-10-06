import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const quranRecord = await db.collection("quran").findOne({
      surahNumber: 2,
      ayahNumber: 275,
    });

    if (!quranRecord) {
      return NextResponse.json(
        {
          success: false,
          message: "Qur'an 2:275 not found",
        },
        { status: 404 }
      );
    }

    const translationIds = quranRecord.translationIds || [];

    const translations = await db
      .collection("translations")
      .find({
        _id: { $in: translationIds },
      })
      .toArray();

    return NextResponse.json({
      success: true,
      reference: quranRecord.reference,
      translationIds,
      translations,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify Qur'an translation link",
      },
      { status: 500 }
    );
  }
}