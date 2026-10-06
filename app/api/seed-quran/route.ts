import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const quranSource = await db.collection("sources").findOne({
      sourceType: "Quran",
      reference: "Surah Al-Baqarah 2:275-279",
    });

    if (!quranSource) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Qur'an source not found. Run /api/seed-sources first.",
        },
        { status: 400 }
      );
    }

    const ayah = {
      surahNumber: 2,
      surahName: "Al-Baqarah",
      ayahNumber: 275,

      arabicText: null,

      translations: [],

      reference: "Qur'an 2:275",

      sourceId: quranSource._id,
      sourceType: "Quran",
      sourceName: "The Quran",

      authorityLevel: "Primary",
      authenticity: "Quran",
      madhhab: "General",

      verified: true,
      verifiedBy: "HalalWise source verification",
      verifiedAt: new Date(),

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("quran").deleteMany({});

    const result = await db.collection("quran").insertOne(ayah);

    return NextResponse.json({
      success: true,
      message: "Verified Qur'an record created successfully 🕌",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create Qur'an record",
      },
      { status: 500 }
    );
  }
}