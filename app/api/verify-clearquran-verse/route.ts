import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

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

    const verse = await db.collection("quran_translations").findOne({
      translationId: translation._id,
      surahNumber: 2,
      ayahNumber: 275,
      verified: true,
    });

    if (!verse) {
      return NextResponse.json({
        success: false,
        message: "Verified Clear Quran 2:275 translation not found",
      });
    }

    return NextResponse.json({
      success: true,
      verse: {
        reference: verse.reference,
        surahNumber: verse.surahNumber,
        surahName: verse.surahName,
        ayahNumber: verse.ayahNumber,
        translationName: translation.translationName,
        translator: translation.translator,
        translationText: verse.translationText,
        verified: verse.verified,
        verifiedBy: verse.verifiedBy,
        licenseName: translation.licenseName,
        licenseStatus: translation.licenseStatus,
        attributionRequired: translation.attributionRequired,
        attributionText: translation.attributionText,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify Clear Quran verse",
      },
      { status: 500 }
    );
  }
}