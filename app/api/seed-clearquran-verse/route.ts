import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export async function POST() {
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

    const translationId = translation._id;

    const existing = await db.collection("quran_translations").findOne({
      translationId,
      surahNumber: 2,
      ayahNumber: 275,
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Clear Quran 2:275 already exists 🕌",
        translationId: translationId.toString(),
        verseId: existing._id.toString(),
      });
    }

    const result = await db.collection("quran_translations").insertOne({
      translationId: new ObjectId(translationId),

      surahNumber: 2,
      surahName: "Al-Baqarah",
      ayahNumber: 275,

      reference: "Qur'an 2:275",

      translationText:
        "Those who swallow usury will not rise, except as someone driven mad by Satan's touch. That is because they say, \"Commerce is like usury.\" But Allah has permitted commerce, and has forbidden usury. Whoever, on receiving advice from his Lord, refrains, may keep his past earnings, and his case rests with Allah. But whoever resumes—these are the dwellers of the Fire, wherein they will abide forever.",

      verified: true,
      verifiedBy: "HalalWise source verification",
      verifiedAt: new Date(),

      sourceType: "Translation",
      sourceName: "ClearQuran.com",
      translator: "Talal Itani",

      licenseName: "CC BY-ND 4.0",
      licenseStatus:
        "Commercial use allowed; attribution required; modification not allowed",
      attributionRequired: true,
      attributionText: "Translation by Talal Itani, ClearQuran.com",

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Clear Quran 2:275 translation stored successfully 🕌",
      insertedId: result.insertedId.toString(),
      translationId: translationId.toString(),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to store Clear Quran translation",
      },
      { status: 500 }
    );
  }
}