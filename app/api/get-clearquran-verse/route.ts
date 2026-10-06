import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const surah = Number(searchParams.get("surah"));
    const ayah = Number(searchParams.get("ayah"));

    if (!surah || !ayah) {
      return NextResponse.json(
        {
          success: false,
          message: "surah and ayah are required",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("halalwise");

    // Find only a verified Clear Quran translation
    const translation = await db.collection("translations").findOne({
      translationName: "Clear Quran",
      translator: "Talal Itani",
      verified: true,
    });

    if (!translation) {
      return NextResponse.json({
        success: false,
        message: "Verified Clear Quran translation not found",
      });
    }

    // Find only a verified verse belonging to that translation
    const verse = await db.collection("quran_translations").findOne({
      translationId: translation._id,
      surahNumber: surah,
      ayahNumber: ayah,
      verified: true,
    });

    if (!verse) {
      return NextResponse.json({
        success: false,
        message: "Verified Clear Quran translation for this verse not found",
      });
    }

    return NextResponse.json({
      success: true,

      verse: {
        reference: verse.reference,
        surahNumber: verse.surahNumber,
        surahName: verse.surahName,
        ayahNumber: verse.ayahNumber,

        translation: {
          name: translation.translationName,
          translator: translation.translator,
          text: verse.translationText,
        },

        verification: {
          verified: verse.verified,
          verifiedBy: verse.verifiedBy,
          verifiedAt: verse.verifiedAt,
        },

        attribution: {
          required: translation.attributionRequired,
          text: translation.attributionText,
        },

        license: {
          name: translation.licenseName,
          status: translation.licenseStatus,
        },
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve Clear Quran translation",
      },
      { status: 500 }
    );
  }
}