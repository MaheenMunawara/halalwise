import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("halalwise");

    // Find the IIFA source
    const iifaSource = await db.collection("sources").findOne({
      sourceType: "IIFA Resolution",
      reference: "Resolution No. 63 (1/7) - Financial Markets",
    });

    // Find the AAOIFI source
    const aaoifiSource = await db.collection("sources").findOne({
      sourceType: "AAOIFI Shariah Standard",
      reference:
        "Shariah Standard No. 21 - Financial Papers (Shares and Bonds)",
    });

    if (!iifaSource) {
      return NextResponse.json(
        {
          success: false,
          message: "IIFA source not found. Run /api/seed-sources first.",
        },
        { status: 400 }
      );
    }

    if (!aaoifiSource) {
      return NextResponse.json(
        {
          success: false,
          message:
            "AAOIFI source not found. Run /api/seed-sources first.",
        },
        { status: 400 }
      );
    }

    const opinions = [
      {
        topic: "Investment in Shares",

        question:
          "Is investing in shares of a company permissible in Islam?",

        ruling:
          "The International Islamic Fiqh Academy states that establishing and participating in joint-stock companies with permissible purposes and licit activities is lawful.",

        opinionType: "Institutional Resolution",

        authorityType: "institutional",

        authority:
          "International Islamic Fiqh Academy",

        scholar: null,

        madhhab: "General",

        conditions: [
          "The company's main purpose and activities must be permissible.",
          "The investment must comply with applicable Shariah rules.",
        ],

        sourceId: iifaSource._id,

        sourceType: iifaSource.sourceType,

        reference: iifaSource.reference,

        authorityLevel: "Institutional",

        verified: true,

        verifiedBy: "HalalWise source verification",

        verifiedAt: new Date(),

        methodology:
          "Institutional Islamic jurisprudence resolution",

        createdAt: new Date(),

        updatedAt: new Date(),
      },

      {
        topic: "Investment in Shares",

        question:
          "What does AAOIFI state about the issuance of shares?",

        ruling:
          "AAOIFI Shariah Standard No. 21 states that issuance of shares is permissible when the objectives for which the corporation was established are permissible according to Shariah. The corporation's objectives should not be prohibited activities such as transactions in riba, liquor, or swine.",

        opinionType: "Shariah Standard",

        authorityType: "institutional",

        authority:
          "Accounting and Auditing Organization for Islamic Financial Institutions (AAOIFI)",

        scholar: null,

        madhhab: "General",

        conditions: [
          "The objectives for which the corporation was established must be permissible according to Shariah.",
          "The corporation should not be established for prohibited activities such as transactions in riba, liquor, or swine.",
        ],

        sourceId: aaoifiSource._id,

        sourceType: aaoifiSource.sourceType,

        reference:
          "Shariah Standard No. 21 - Financial Papers (Shares and Bonds), clause 2/1",

        authorityLevel: "Institutional",

        verified: true,

        verifiedBy: "HalalWise source verification",

        verifiedAt: new Date(),

        methodology:
          "AAOIFI Shariah Standard",

        createdAt: new Date(),

        updatedAt: new Date(),
      },
    ];

    // Replace the opinion records with the verified set
    await db.collection("opinions").deleteMany({});

    const result = await db
      .collection("opinions")
      .insertMany(opinions);

    return NextResponse.json({
      success: true,
      message:
        "Verified scholarly opinions added successfully 🕌",
      insertedCount: result.insertedCount,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to add scholarly opinions",
      },
      {
        status: 500,
      }
    );
  }
}