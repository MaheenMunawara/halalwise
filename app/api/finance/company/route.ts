import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { calculateFinancialRatios } from "../validation";
import { screenStock } from "../screening";
import { calculateDataFreshness } from "../freshness";

const uri =
  process.env.MONGODB_URI ??
  (() => {
    throw new Error("MONGODB_URI is not defined");
  })();

function createSummary(result: string) {
  if (result === "compliant") {
    return "The available business activity and financial screening checks pass the selected Shariah screening criteria.";
  }

  if (result === "not_compliant") {
    return "One or more screening checks did not meet the selected Shariah screening criteria.";
  }

  if (result === "needs_review") {
    return "The available information indicates that further Shariah review is required before relying on this result.";
  }

  if (result === "insufficient_data") {
    return "The stock cannot be fully evaluated because some required financial information is unavailable.";
  }

  return "The stock screening result could not be determined.";
}

export async function GET(request: Request) {
  const client = new MongoClient(uri);

  try {
    const { searchParams } = new URL(request.url);

    const ticker = searchParams
      .get("ticker")
      ?.trim()
      .toUpperCase();

    if (!ticker) {
      return NextResponse.json(
        {
          success: false,
          error: "Ticker is required.",
        },
        { status: 400 }
      );
    }

    await client.connect();

    const db = client.db("halalwise");

    const company = await db
      .collection("finance_companies")
      .findOne(
        { ticker },
        {
          projection: {
            _id: 0,
          },
        }
      );

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          error: "Company not found.",
        },
        { status: 404 }
      );
    }

    const businessActivity =
      company.businessActivity || {};

    const financialData =
      company.financialData || {};

    const businessClassification =
      company.businessClassification ||
      businessActivity.classification ||
      "unclear";

    const mainBusinessActivity =
      company.mainBusinessActivity ||
      businessActivity.mainBusinessActivity ||
      "";

    const prohibitedActivities =
      company.prohibitedActivities ||
      businessActivity.prohibitedActivities ||
      [];

    const businessActivityNotes =
      company.businessActivityNotes ||
      businessActivity.notes ||
      "";

    const marketCapitalization =
      company.marketCapitalization ??
      financialData.marketCapitalization;

    const interestBearingDebt =
      company.interestBearingDebt ??
      financialData.interestBearingDebt;

    const interestBearingAssets =
      company.interestBearingAssets ??
      financialData.interestBearingAssets;

    const totalIncome =
      company.totalIncome ??
      financialData.totalIncome;

    const impermissibleIncome =
      company.impermissibleIncome ??
      financialData.impermissibleIncome;

    const marketCapNumber =
      marketCapitalization === null ||
      marketCapitalization === undefined ||
      marketCapitalization === ""
        ? null
        : Number(marketCapitalization);

    const debtNumber =
      interestBearingDebt === null ||
      interestBearingDebt === undefined ||
      interestBearingDebt === ""
        ? null
        : Number(interestBearingDebt);

    const interestBearingAssetsNumber =
      interestBearingAssets === null ||
      interestBearingAssets === undefined ||
      interestBearingAssets === ""
        ? null
        : Number(interestBearingAssets);

    const totalIncomeNumber =
      totalIncome === null ||
      totalIncome === undefined ||
      totalIncome === ""
        ? null
        : Number(totalIncome);

    const impermissibleIncomeNumber =
      impermissibleIncome === null ||
      impermissibleIncome === undefined ||
      impermissibleIncome === ""
        ? null
        : Number(impermissibleIncome);

    const hasMarketCapAndDebt =
      marketCapNumber !== null &&
      Number.isFinite(marketCapNumber) &&
      marketCapNumber > 0 &&
      debtNumber !== null &&
      Number.isFinite(debtNumber) &&
      debtNumber >= 0;

    const hasInterestBearingAssets =
      interestBearingAssetsNumber !== null &&
      Number.isFinite(
        interestBearingAssetsNumber
      );

    const hasTotalIncomeAndImpermissibleIncome =
      totalIncomeNumber !== null &&
      Number.isFinite(totalIncomeNumber) &&
      totalIncomeNumber > 0 &&
      impermissibleIncomeNumber !== null &&
      Number.isFinite(
        impermissibleIncomeNumber
      );

    const ratios = calculateFinancialRatios({
      marketCapitalization:
        hasMarketCapAndDebt
          ? marketCapNumber
          : null,

      interestBearingDebt:
        hasMarketCapAndDebt
          ? debtNumber
          : null,

      interestBearingAssets:
        hasInterestBearingAssets
          ? interestBearingAssetsNumber
          : null,

      totalIncome:
        totalIncomeNumber !== null &&
        Number.isFinite(totalIncomeNumber) &&
        totalIncomeNumber > 0
          ? totalIncomeNumber
          : null,

      impermissibleIncome:
        hasTotalIncomeAndImpermissibleIncome
          ? impermissibleIncomeNumber
          : null,
    });

    const screening = screenStock({
      businessClassification:
        businessClassification as
          | "permissible"
          | "prohibited"
          | "mixed"
          | "unclear",

      debtRatio: ratios.debtRatio,

      interestBearingAssetsRatio:
        ratios.interestBearingAssetsRatio,

      impermissibleIncomeRatio:
        ratios.impermissibleIncomeRatio,
    });

    const hasRequiredBusinessData =
      Boolean(mainBusinessActivity) &&
      Boolean(businessClassification) &&
      businessClassification !== "unclear";

    const hasRequiredFinancialData =
      hasMarketCapAndDebt &&
      hasInterestBearingAssets &&
      hasTotalIncomeAndImpermissibleIncome;

    const dataQuality = {
      hasMissingRequiredData:
        !hasRequiredFinancialData ||
        !hasRequiredBusinessData,

      status:
        hasRequiredFinancialData &&
        hasRequiredBusinessData
          ? "complete"
          : "incomplete",
    };

    const financialDataSource =
      company.financialDataSource || {};

    const financialDataDate =
      financialDataSource.dataDate ||
      company.dataDate ||
      financialData.dataDate ||
      null;

    const freshness =
      calculateDataFreshness(
        financialDataDate
      );

    return NextResponse.json({
      success: true,

      company: {
        companyName:
          company.companyName,

        ticker: company.ticker,

        exchange:
          company.exchange ?? null,

        sector:
          company.sector ?? null,
      },

      businessActivity: {
        mainBusinessActivity,

        classification:
          businessClassification,

        prohibitedActivities:
          Array.isArray(
            prohibitedActivities
          )
            ? prohibitedActivities
            : [],

        notes:
          businessActivityNotes,
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
        debtRatio:
          ratios.debtRatio ?? null,

        interestBearingAssetsRatio:
          ratios.interestBearingAssetsRatio ??
          null,

        impermissibleIncomeRatio:
          ratios.impermissibleIncomeRatio ??
          null,
      },

      screeningResult:
        screening.result,

      explanation: {
        summary: createSummary(
          screening.result
        ),

        checks:
          screening.checks,
      },

      methodology: {
        name:
          company.methodology?.name ||
          "AAOIFI Shariah Standard-based screening",

        source:
          company.methodology?.source ||
          "AAOIFI",

        sourceUrl:
          company.methodology?.sourceUrl ||
          "https://aaoifi.com/download/24233/",
      },

      financialDataSource:
        company.financialDataSource ||
        null,

      verification: {
        status:
          company.verification?.status ||
          company.verificationStatus ||
          "unverified",

        verifiedAt:
          company.verification?.verifiedAt ||
          null,

        verifiedBy:
          company.verification?.verifiedBy ||
          null,

        verificationNotes:
          company.verification
            ?.verificationNotes ||
          null,
      },

      dataFreshness:
        freshness,

      dataQuality,
    });
  } catch (error) {
    console.error(
      "Finance company lookup failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Finance company lookup failed.",
      },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}