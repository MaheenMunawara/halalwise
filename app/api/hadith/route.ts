import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const hadithNumber = Number(
      searchParams.get("hadithNumber")
    );

    if (!hadithNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "hadithNumber is required",
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------------------------
    // STEP 1: Connect to MongoDB
    // -----------------------------------------------

    const client = await clientPromise;
    const db = client.db("halalwise");

    // -----------------------------------------------
    // STEP 2: Find the Hadith
    // -----------------------------------------------

    const hadith = await db
      .collection("hadith")
      .findOne({
        collection: "Sahih al-Bukhari",
        hadithNumber,
        verified: true,
      });

    // -----------------------------------------------
    // STEP 3: Hadith not found
    // -----------------------------------------------

    if (!hadith) {
      return NextResponse.json({
        success: false,
        error:
          "A verified Hadith with this reference could not be found.",
      });
    }

    // -----------------------------------------------
    // STEP 4: Verify linked source
    // -----------------------------------------------

    let linkedSource = null;

    if (hadith.sourceId) {
      linkedSource = await db
        .collection("sources")
        .findOne({
          _id: hadith.sourceId,
          verified: true,
        });
    }

    // -----------------------------------------------
    // STEP 5: Source must be verified
    // -----------------------------------------------

    if (!linkedSource) {
      return NextResponse.json({
        success: false,
        error:
          "The Hadith was found, but its authoritative source could not be verified.",
      });
    }

    // -----------------------------------------------
    // STEP 6: Return verified Hadith
    // -----------------------------------------------

    return NextResponse.json({
      success: true,

      hadith: {
        id: hadith._id,

        collection: hadith.collection,

        hadithNumber: hadith.hadithNumber,

        book: hadith.book,

        bookNumber: hadith.bookNumber,

        chapter: hadith.chapter,

        chapterNumber: hadith.chapterNumber,

        narrator: hadith.narrator,

        narratorReference:
          hadith.narratorReference,

        arabicText: hadith.arabicText,

        translation: hadith.translation,

        authenticity: hadith.authenticity,

        reference: hadith.reference,

        sourceName: hadith.sourceName,

        sourceUrl: hadith.sourceUrl,

        verified: hadith.verified,

        verifiedBy: hadith.verifiedBy,

        verifiedAt: hadith.verifiedAt,
      },

      source: {
        sourceId: linkedSource._id,

        sourceType: linkedSource.sourceType,

        sourceName: linkedSource.sourceName,

        reference: linkedSource.reference,

        authorityLevel:
          linkedSource.authorityLevel,

        authenticity:
          linkedSource.authenticity,

        madhhab: linkedSource.madhhab,

        methodology:
          linkedSource.methodology,

        verified: linkedSource.verified,

        verifiedBy: linkedSource.verifiedBy,

        verifiedAt: linkedSource.verifiedAt,

        sourceUrl: linkedSource.sourceUrl,
      },
    });
  } catch (error) {
    console.error(
      "Hadith API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong",
      },
      {
        status: 500,
      }
    );
  }
}