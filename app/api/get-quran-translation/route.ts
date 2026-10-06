import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const surahNumber = Number(searchParams.get("surah"));
    const ayahNumber = Number(searchParams.get("ayah"));
    const translationId = searchParams.get("translationId");

    if (!surahNumber || !ayahNumber || !translationId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please provide surah, ayah, and translationId",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("halalwise");

    const { ObjectId } = await import("mongodb");

    const translation = await db.collection("translations").findOne({
      _id: new ObjectId(translationId),
      verified: true,
    });

    if (!translation) {
      return NextResponse.json(
        {
          success: false,
          message: "Verified translation not found",
        },
        { status: 404 }
      );
    }

    const verseTranslation = await db
      .collection("quran_translations")
      .findOne({
        translationId: translation._id,
        surahNumber,
        ayahNumber,
        verified: true,
      });

    if (!verseTranslation) {
      return NextResponse.json(
        {
          success: false,
          message: "Verified translation text not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      reference: `Qur'an ${surahNumber}:${ayahNumber}`,
      translation: {
        translationName: translation.translationName,
        language: translation.language,
        translator: translation.translator,
        text: verseTranslation.text,
      },
      verified: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve Qur'an translation",
      },
      { status: 500 }
    );
  }
}