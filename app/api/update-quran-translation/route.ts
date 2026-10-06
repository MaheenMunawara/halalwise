import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const result = await db.collection("quran").updateOne(
      {
        surahNumber: 2,
        ayahNumber: 275,
      },
      {
        $set: {
          translations: [
            {
              language: "English",
              translationName: "Saheeh International",
              translator: "Saheeh International",
              translationSource: "Tanzil Translation Repository",
              translationSourceUrl: "https://tanzil.net/trans/",
              permissionStatus: "Permission required for commercial use",
              verified: true,
              verifiedBy: "HalalWise source verification",
              verifiedAt: new Date(),
            },
          ],
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "English Qur'an translation metadata added successfully 🕌",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update Qur'an translation metadata",
      },
      { status: 500 }
    );
  }
}