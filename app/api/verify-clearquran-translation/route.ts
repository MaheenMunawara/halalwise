import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const translation = await db.collection("translations").findOne({
      translationName: "Clear Quran",
      language: "English",
    });

    if (!translation) {
      return NextResponse.json(
        {
          success: false,
          message: "Clear Quran translation not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      translation: {
        translationName: translation.translationName,
        language: translation.language,
        translator: translation.translator,
        sourceName: translation.sourceName,
        sourceUrl: translation.sourceUrl,
        licenseName: translation.licenseName,
        licenseStatus: translation.licenseStatus,
        attributionRequired: translation.attributionRequired,
        attributionText: translation.attributionText,
        verified: translation.verified,
        verifiedBy: translation.verifiedBy,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify Clear Quran translation",
      },
      { status: 500 }
    );
  }
}