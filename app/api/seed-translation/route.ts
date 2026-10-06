import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const existing = await db.collection("translations").findOne({
      translationName: "Saheeh International",
      language: "English",
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Saheeh International translation already exists 🕌",
        translationId: existing._id,
      });
    }

    const result = await db.collection("translations").insertOne({
      translationName: "Saheeh International",
      language: "English",
      translator: "Saheeh International",
      sourceName: "Tanzil Translation Repository",
      sourceUrl: "https://tanzil.net/trans/",
      licenseStatus: "Permission required for commercial use",
      verified: true,
      verifiedBy: "HalalWise source verification",
      verifiedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Saheeh International translation added successfully 🕌",
      translationId: result.insertedId,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to add translation",
      },
      { status: 500 }
    );
  }
}