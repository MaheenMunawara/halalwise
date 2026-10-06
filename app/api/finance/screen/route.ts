import { NextResponse } from "next/server";

type ScreeningInput = {
  businessActivityAllowed: boolean | null;
  interestBearingDebt: number | null;
  marketCapitalization: number | null;
  interestBearingAssets: number | null;
  impermissibleIncome: number | null;
  totalIncome: number | null;
};

type ScreeningResult =
  | "compliant"
  | "not_compliant"
  | "needs_review"
  | "insufficient_data";

function calculateRatio(
  numerator: number | null,
  denominator: number | null
) {
  if (
    numerator === null ||
    denominator === null ||
    denominator <= 0
  ) {
    return null;
  }

  return (numerator / denominator) * 100;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const input: ScreeningInput = {
      businessActivityAllowed:
        typeof body?.businessActivityAllowed === "boolean"
          ? body.businessActivityAllowed
          : null,

      interestBearingDebt:
        typeof body?.interestBearingDebt === "number"
          ? body.interestBearingDebt
          : null,

      marketCapitalization:
        typeof body?.marketCapitalization === "number"
          ? body.marketCapitalization
          : null,

      interestBearingAssets:
        typeof body?.interestBearingAssets === "number"
          ? body.interestBearingAssets
          : null,

      impermissibleIncome:
        typeof body?.impermissibleIncome === "number"
          ? body.impermissibleIncome
          : null,

      totalIncome:
        typeof body?.totalIncome === "number"
          ? body.totalIncome
          : null,
    };

    const debtRatio = calculateRatio(
      input.interestBearingDebt,
      input.marketCapitalization
    );

    const interestBearingAssetsRatio = calculateRatio(
      input.interestBearingAssets,
      input.marketCapitalization
    );

    const impermissibleIncomeRatio = calculateRatio(
      input.impermissibleIncome,
      input.totalIncome
    );

    const businessActivityPassed =
      input.businessActivityAllowed === true;

    const businessActivityFailed =
      input.businessActivityAllowed === false;

    const debtPassed =
      debtRatio !== null && debtRatio < 30;

    const interestBearingAssetsPassed =
      interestBearingAssetsRatio !== null &&
      interestBearingAssetsRatio < 30;

    const impermissibleIncomePassed =
      impermissibleIncomeRatio !== null &&
      impermissibleIncomeRatio < 5;

    const allFinancialDataAvailable =
      debtRatio !== null &&
      interestBearingAssetsRatio !== null &&
      impermissibleIncomeRatio !== null;

    let screeningResult: ScreeningResult;

    if (businessActivityFailed) {
      screeningResult = "not_compliant";
    } else if (!allFinancialDataAvailable) {
      screeningResult = "insufficient_data";
    } else if (
      businessActivityPassed &&
      debtPassed &&
      interestBearingAssetsPassed &&
      impermissibleIncomePassed
    ) {
      screeningResult = "compliant";
    } else {
      screeningResult = "not_compliant";
    }

    return NextResponse.json({
      success: true,

      methodology: {
        name: "AAOIFI Shariah Standard No. 21",
        version: "AAOIFI-based screening",
        source: "AAOIFI",
        sourceUrl:
          "https://aaoifi.com/download/24233/",
      },

      thresholds: {
        interestBearingDebt: {
          maximumPercent: 30,
          comparison: "< 30%",
        },

        interestBearingAssets: {
          maximumPercent: 30,
          comparison: "< 30%",
        },

        impermissibleIncome: {
          maximumPercent: 5,
          comparison: "< 5%",
        },
      },

      ratios: {
        debtRatio,
        interestBearingAssetsRatio,
        impermissibleIncomeRatio,
      },

      checks: {
        businessActivityPassed,
        debtPassed,
        interestBearingAssetsPassed,
        impermissibleIncomePassed,
      },

      screeningResult,

      disclaimer:
        "This is an educational Shariah screening tool based on the selected methodology. It is not a fatwa or a substitute for qualified scholarly advice.",
    });
  } catch (error) {
    console.error(
      "Finance screening failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to screen the company.",
      },
      {
        status: 500,
      }
    );
  }
}