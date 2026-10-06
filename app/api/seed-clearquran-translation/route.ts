import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const existing = await db.collection("translations").findOne({
      translationName: "Clear Quran",
      language: "English",
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Clear Quran translation already exists 🕌",
        translationId: existing._id,
      });
    }

    const result = await db.collection("translations").insertOne({
      translationName: "Clear Quran",
      language: "English",
      translator: "Talal Itani",
      sourceName: "ClearQuran.com",
      sourceUrl: "https://www.clearquran.com/",
      licenseName: "CC BY-ND 4.0",
      licenseStatus: "Commercial use allowed; attribution required; modification not allowed",
      attributionRequired: true,
      attributionText: "Translation by Talal Itani, ClearQuran.com",
      verified: true,
      verifiedBy: "HalalWise source verification",
      verifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Clear Quran translation added successfully 🕌",
      translationId: result.insertedId,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to add Clear Quran translation",
      },
      { status: 500 }
    );
  }
}