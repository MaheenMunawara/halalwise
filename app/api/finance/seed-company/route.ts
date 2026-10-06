
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { auth } from "@/auth";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

type BusinessClassification =
  | "permissible"
  | "prohibited"
  | "mixed"
  | "unclear";

type VerificationStatus =
  | "verified"
  | "pending"
  | "unverified";

function calculateRatio(
  numerator: number | null,
  denominator: number | null
) {
  if (
    numerator === null ||
    denominator === null ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return null;
  }

  return Number(
    ((numerator / denominator) * 100).toFixed(2)
  );
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
          "You are not authorized to manage finance records.",
      },
      { status: 403 }
    );
  }

  const client = new MongoClient(uri);

  try {
    const body = await request.json();

    const {
      companyName,
      ticker,
      exchange,
      sector,

      mainBusinessActivity,
      businessClassification,
      prohibitedActivities,
      businessActivityNotes,

      marketCapitalization,
      interestBearingDebt,
      interestBearingAssets,
      totalIncome,
      impermissibleIncome,

      dataDate,
      financialDataSource,
      financialDataSourceUrl,

      methodologyName,
      methodologySource,
      methodologySourceUrl,

      verificationStatus,
      verifiedAt,
      verifiedBy,
      verificationNotes,
    } = body;

    if (!companyName || !ticker) {
      return NextResponse.json(
        {
          success: false,
          error:
            "companyName and ticker are required.",
        },
        { status: 400 }
      );
    }

    const normalizedTicker =
      String(ticker).trim().toUpperCase();

    const allowedClassifications: BusinessClassification[] =
      [
        "permissible",
        "prohibited",
        "mixed",
        "unclear",
      ];

    const finalClassification =
      allowedClassifications.includes(
        businessClassification
      )
        ? businessClassification
        : "unclear";

    const allowedVerificationStatuses: VerificationStatus[] =
      [
        "verified",
        "pending",
        "unverified",
      ];

    const finalVerificationStatus =
      allowedVerificationStatuses.includes(
        verificationStatus
      )
        ? verificationStatus
        : "pending";

    /*
     * This endpoint is for creating/updating finance
     * records. Verification itself must go through
     * /api/finance/verify so that all verification
     * screening rules are enforced there.
     *
     * Therefore this endpoint never directly creates
     * a verified record.
     */

    if (
      finalVerificationStatus ===
      "verified"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Finance records must be verified through the finance verification workflow.",
        },
        { status: 400 }
      );
    }

    const db = client.db("halalwise");

    const collection =
      db.collection("finance_companies");

    const debtRatio = calculateRatio(
      interestBearingDebt ?? null,
      marketCapitalization ?? null
    );

    const interestBearingAssetsRatio =
      calculateRatio(
        interestBearingAssets ?? null,
        marketCapitalization ?? null
      );

    const impermissibleIncomeRatio =
      calculateRatio(
        impermissibleIncome ?? null,
        totalIncome ?? null
      );

    let businessActivityResult:
      | "pass"
      | "fail"
      | "review";

    if (
      finalClassification ===
      "permissible"
    ) {
      businessActivityResult = "pass";
    } else if (
      finalClassification ===
      "prohibited"
    ) {
      businessActivityResult = "fail";
    } else {
      businessActivityResult = "review";
    }

    const company = {
      companyName:
        String(companyName).trim(),

      ticker: normalizedTicker,

      exchange:
        exchange !== undefined &&
        exchange !== null
          ? String(exchange).trim()
          : null,

      sector:
        sector !== undefined &&
        sector !== null
          ? String(sector).trim()
          : null,

      businessActivity: {
        mainBusinessActivity:
          mainBusinessActivity ?? null,

        classification:
          finalClassification,

        prohibitedActivities:
          Array.isArray(
            prohibitedActivities
          )
            ? prohibitedActivities
            : [],

        notes:
          businessActivityNotes ?? null,

        screeningResult:
          businessActivityResult,
      },

      financialData: {
        marketCapitalization:
          marketCapitalization ?? null,

        interestBearingDebt:
          interestBearingDebt ?? null,

        interestBearingAssets:
          interestBearingAssets ?? null,

        totalIncome:
          totalIncome ?? null,

        impermissibleIncome:
          impermissibleIncome ?? null,
      },

      ratios: {
        debtRatio,

        interestBearingAssetsRatio,

        impermissibleIncomeRatio,
      },

      methodology: {
        name:
          methodologyName ??
          "AAOIFI Shariah Standard-based screening",

        source:
          methodologySource ??
          "AAOIFI",

        sourceUrl:
          methodologySourceUrl ??
          "https://aaoifi.com/download/24233/",
      },

      financialDataSource: {
        name:
          financialDataSource ?? null,

        url:
          financialDataSourceUrl ?? null,

        dataDate:
          dataDate ?? null,
      },

      verification: {
        status:
          finalVerificationStatus ===
          "verified"
            ? "pending"
            : finalVerificationStatus,

        verifiedAt: null,

        verifiedBy: null,

        verificationNotes:
          verificationNotes ?? null,
      },

      updatedAt: new Date(),
    };

    const result =
      await collection.updateOne(
        {
          ticker: normalizedTicker,
        },
        {
          $set: company,

          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        {
          upsert: true,
        }
      );

    return NextResponse.json({
      success: true,

      message:
        "Company screening data saved as a pending finance record.",

      ticker: normalizedTicker,

      methodology:
        company.methodology,

      verification:
        company.verification,

      databaseOperation:
        result.upsertedCount === 1
          ? "company_created"
          : "company_updated",
    });
  } catch (error) {
    console.error(
      "Finance metadata save failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to save finance metadata.",
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,

    message:
      "Finance methodology, source, and verification metadata API is ready. Use POST to add or update company data.",
  });
}
