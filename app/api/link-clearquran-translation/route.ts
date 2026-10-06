import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const translation = await db.collection("translations").findOne({
      translationName: "Clear Quran",
      language: "English",
      verified: true,
    });

    if (!translation) {
      return NextResponse.json(
        {
          success: false,
          message: "Verified Clear Quran translation not found",
        },
        { status: 404 }
      );
    }

    const result = await db.collection("quran").updateOne(
      {
        surahNumber: 2,
        ayahNumber: 275,
      },
      {
        $addToSet: {
          translationIds: translation._id,
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Clear Quran linked to Qur'an 2:275 successfully 🕌",
      translationId: translation._id,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to link Clear Quran translation",
      },
      { status: 500 }
    );
  }
}