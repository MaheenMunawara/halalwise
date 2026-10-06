
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { auth } from "@/auth";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      {
        success: false,
        error: "You must be logged in.",
      },
      { status: 401 }
    );
  }

  if (session.user.role !== "finance_reviewer") {
    return NextResponse.json(
      {
        success: false,
        error:
          "You are not authorized to verify finance records.",
      },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body.",
      },
      { status: 400 }
    );
  }

  const data =
    typeof body === "object" &&
    body !== null
      ? (body as Record<string, unknown>)
      : {};

  const ticker =
    typeof data.ticker === "string"
      ? data.ticker.trim().toUpperCase()
      : "";

  const verificationNotes =
    typeof data.verificationNotes === "string"
      ? data.verificationNotes.trim()
      : "";

  if (!ticker) {
    return NextResponse.json(
      {
        success: false,
        error: "Ticker is required.",
      },
      { status: 400 }
    );
  }

  if (!verificationNotes) {
    return NextResponse.json(
      {
        success: false,
        error: "Verification notes are required.",
      },
      { status: 400 }
    );
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db("halalwise");

    const collection =
      db.collection("finance_companies");

    const company = await collection.findOne({
      ticker,
    });

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error: "Company not found.",
        },
        { status: 404 }
      );
    }

    const classification =
      company.businessActivity
        ?.classification;

    const ratios =
      company.ratios ?? {};

    const debtRatio =
      typeof ratios.debtRatio === "number"
        ? ratios.debtRatio
        : null;

    const interestBearingAssets =
      typeof ratios.interestBearingAssetsRatio ===
      "number"
        ? ratios.interestBearingAssetsRatio
        : null;

    const impermissibleIncome =
      typeof ratios.impermissibleIncomeRatio ===
      "number"
        ? ratios.impermissibleIncomeRatio
        : null;

    /*
     * A company cannot be marked as verified
     * when required screening information is
     * missing or when the business activity
     * itself requires further review.
     */

    if (
      classification === "mixed" ||
      classification === "unclear"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This company requires further Shariah review because its business classification is not fully permissible.",
        },
        { status: 400 }
      );
    }

    if (classification === "prohibited") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This company cannot be marked as verified because its business classification is prohibited.",
        },
        { status: 400 }
      );
    }

    if (classification !== "permissible") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Business classification must be reviewed before verification.",
        },
        { status: 400 }
      );
    }

    if (
      debtRatio === null ||
      interestBearingAssets === null ||
      impermissibleIncome === null
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This company cannot be marked as verified because one or more required financial screening values are unavailable.",
          missingData: {
            debtRatio:
              debtRatio === null,
            interestBearingAssets:
              interestBearingAssets === null,
            impermissibleIncome:
              impermissibleIncome === null,
          },
        },
        { status: 400 }
      );
    }

    const verifiedAt =
      new Date().toISOString();

    const verifiedBy =
      session.user.email;

    await collection.updateOne(
      { ticker },
      {
        $set: {
          "verification.status":
            "verified",

          "verification.verifiedAt":
            verifiedAt,

          "verification.verifiedBy":
            verifiedBy,

          "verification.verificationNotes":
            verificationNotes,

          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,

      message:
        "Company verification completed successfully.",

      ticker,

      verification: {
        status: "verified",
        verifiedAt,
        verifiedBy,
        verificationNotes,
      },
    });
  } catch (error) {
    console.error(
      "Finance verification failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to verify the company.",
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
