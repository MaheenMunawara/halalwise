import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const sources = [
      {
        sourceType: "Quran",
        sourceName: "The Quran",
        reference: "Surah Al-Baqarah 2:275-279",
        sourceCategory: "Primary Islamic Source",

        originalText: null,
        translation: null,
        translationName: null,
        translationSource: null,

        authorityLevel: "Primary",
        authenticity: "Quran",
        madhhab: "General",

        verified: true,
        verifiedBy: "HalalWise source verification",
        verifiedAt: new Date(),

        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        sourceType: "IIFA Resolution",
        sourceName: "International Islamic Fiqh Academy",
        reference: "Resolution No. 63 (1/7) - Financial Markets",
        sourceCategory: "Institutional Islamic Fiqh Resolution",

        originalText: null,
        translation: null,
        translationName: null,
        translationSource: null,

        authorityLevel: "Institutional",
        authenticity: "Official IIFA Resolution",
        madhhab: "General",

        verified: true,
        verifiedBy: "HalalWise source verification",
        verifiedAt: new Date(),

        createdAt: new Date(),
        updatedAt: new Date(),
      },

      {
        sourceType: "AAOIFI Shariah Standard",
        sourceName:
          "Accounting and Auditing Organization for Islamic Financial Institutions (AAOIFI)",
        reference:
          "Shariah Standard No. 21 - Financial Papers (Shares and Bonds)",
        sourceCategory: "Institutional Islamic Finance Standard",

        originalText: null,
        translation: null,
        translationName: null,
        translationSource: null,

        authorityLevel: "Institutional",
        authenticity: "Official AAOIFI Shariah Standard",
        madhhab: "General",

        verified: true,
        verifiedBy: "HalalWise source verification",
        verifiedAt: new Date(),

        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.collection("sources").deleteMany({});

    const result = await db
      .collection("sources")
      .insertMany(sources);

    return NextResponse.json({
      success: true,
      message: "Source collection created successfully 🕌",
      insertedCount: result.insertedCount,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create sources",
      },
      {
        status: 500,
      }
    );
  }
}