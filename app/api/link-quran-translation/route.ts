import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const translation = await db.collection("translations").findOne({
      translationName: "Saheeh International",
      language: "English",
    });

    if (!translation) {
      return NextResponse.json(
        {
          success: false,
          message: "Saheeh International translation not found",
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
        $set: {
          translationIds: [translation._id],
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Qur'an verse linked to translation registry successfully 🕌",
      translationId: translation._id,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to link Qur'an translation",
      },
      { status: 500 }
    );
  }
}