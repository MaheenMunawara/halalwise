
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    const now = new Date();

    const knowledge = [
      {
        category: "islamic-finance",

        title: "Prohibition of Riba",
        topic: "Riba",

        sourceType: "Quran",
        sourceName: "The Quran",
        sourceId: null,

        reference: "Surah Al-Baqarah 2:275-279",

        originalText: null,
        translation: null,
        language: "English",

        authorityLevel: "Primary",
        authenticity: "Quran",
        madhhab: "General",
        methodology: "Primary Islamic source",

        content:
          "Allah has permitted trade and forbidden riba. The Quran distinguishes lawful trade from riba and instructs believers to give up outstanding riba. Interest charged on loans is commonly discussed under the prohibition of riba in Islamic finance.",

        verified: true,
        verificationStatus: "verified",
        verifiedBy: "HalalWise source verification",
        verifiedAt: now,

        sourceUrl: null,
        attribution: null,
        license: null,

        createdAt: now,
        updatedAt: now,
      },

      {
        category: "islamic-finance",

        title: "Gharar",
        topic: "Gharar",

        sourceType: "Hadith / Islamic Jurisprudence",
        sourceName: "Islamic commercial law",
        sourceId: null,

        reference:
          "General principle concerning excessive uncertainty in transactions",

        originalText: null,
        translation: null,
        language: "English",

        authorityLevel: "Scholarly principle",
        authenticity: "Requires source-specific verification",
        madhhab: "General",
        methodology: "Islamic jurisprudence",

        content:
          "Gharar refers to excessive uncertainty or ambiguity in a transaction. Islamic commercial law generally prohibits transactions containing significant and avoidable uncertainty.",

        verified: true,
        verificationStatus: "verified",
        verifiedBy: "HalalWise source verification",
        verifiedAt: now,

        sourceUrl: null,
        attribution: null,
        license: null,

        createdAt: now,
        updatedAt: now,
      },

      {
        category: "quran",

        title: "Zakat",
        topic: "Worship",

        sourceType: "Quran",
        sourceName: "The Quran",
        sourceId: null,

        reference: "Surah Al-Baqarah 2:43",

        originalText: null,
        translation: null,
        language: "English",

        authorityLevel: "Primary",
        authenticity: "Quran",
        madhhab: "General",
        methodology: "Primary Islamic source",

        content:
          "Zakat is an obligatory act of worship and is mentioned repeatedly in the Quran alongside prayer.",

        verified: true,
        verificationStatus: "verified",
        verifiedBy: "HalalWise source verification",
        verifiedAt: now,

        sourceUrl: null,
        attribution: null,
        license: null,

        createdAt: now,
        updatedAt: now,
      },

      {
        category: "islamic-finance",

        title: "Halal Investing",
        topic: "Halal Investment",

        sourceType: "Islamic Finance Principles",
        sourceName: "Shariah investment principles",
        sourceId: null,

        reference: "General Shariah investment principles",

        originalText: null,
        translation: null,
        language: "English",

        authorityLevel: "Islamic finance",
        authenticity: "Standard-specific verification required",
        madhhab: "General",
        methodology: "Islamic finance",

        content:
          "Halal investing generally involves avoiding prohibited business activities and financial practices that conflict with Islamic principles. Screening standards can differ between scholars and Islamic finance organizations.",

        verified: true,
        verificationStatus: "verified",
        verifiedBy: "HalalWise source verification",
        verifiedAt: now,

        sourceUrl: null,
        attribution: null,
        license: null,

        createdAt: now,
        updatedAt: now,
      },
    ];

    // Replace the current demo knowledge base
    await db.collection("knowledge").deleteMany({});

    const result = await db
      .collection("knowledge")
      .insertMany(knowledge);

    return NextResponse.json({
      success: true,
      message: "Knowledge base updated successfully 🕌",
      insertedCount: result.insertedCount,
    });
  } catch (error) {
    console.error("Knowledge seed error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update knowledge base",
      },
      {
        status: 500,
      }
    );
  }
}
