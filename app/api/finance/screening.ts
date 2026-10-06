import type {
  StockBusinessClassification,
  StockScreeningResult,
} from "./types";

type ScreeningInput = {
  businessClassification:
    | StockBusinessClassification
    | undefined;

  debtRatio: number | undefined;

  interestBearingAssetsRatio:
    | number
    | undefined;

  impermissibleIncomeRatio:
    | number
    | undefined;
};

export type ScreeningCheck = {
  status:
    | "pass"
    | "fail"
    | "review"
    | "unavailable";

  message: string;
};

export function screenStock(
  data: ScreeningInput
) {
  const checks: {
    businessActivity: ScreeningCheck;
    debtRatio: ScreeningCheck;
    interestBearingAssets: ScreeningCheck;
    impermissibleIncome: ScreeningCheck;
  } = {
    businessActivity: {
      status: "unavailable",
      message:
        "Business activity information is unavailable.",
    },

    debtRatio: {
      status: "unavailable",
      message:
        "Debt ratio information is unavailable.",
    },

    interestBearingAssets: {
      status: "unavailable",
      message:
        "Interest-bearing assets information is unavailable.",
    },

    impermissibleIncome: {
      status: "unavailable",
      message:
        "Impermissible income information is unavailable.",
    },
  };

  if (
    data.businessClassification ===
    "permissible"
  ) {
    checks.businessActivity = {
      status: "pass",
      message:
        "The recorded business activity is classified as permissible.",
    };
  } else if (
    data.businessClassification ===
    "prohibited"
  ) {
    checks.businessActivity = {
      status: "fail",
      message:
        "The recorded business activity is classified as prohibited.",
    };
  } else if (
    data.businessClassification === "mixed"
  ) {
    checks.businessActivity = {
      status: "review",
      message:
        "The business has mixed activities and requires further review.",
    };
  } else {
    checks.businessActivity = {
      status: "review",
      message:
        "The business activity could not be clearly classified.",
    };
  }

  if (
    data.debtRatio === undefined ||
    !Number.isFinite(data.debtRatio)
  ) {
    checks.debtRatio = {
      status: "unavailable",
      message:
        "Debt ratio cannot be evaluated because the required data is unavailable.",
    };
  } else if (data.debtRatio < 30) {
    checks.debtRatio = {
      status: "pass",
      message:
        `Debt ratio is ${data.debtRatio}%, below the selected 30% threshold.`,
    };
  } else {
    checks.debtRatio = {
      status: "fail",
      message:
        `Debt ratio is ${data.debtRatio}%, which reaches or exceeds the selected 30% threshold.`,
    };
  }

  if (
    data.interestBearingAssetsRatio ===
      undefined ||
    !Number.isFinite(
      data.interestBearingAssetsRatio
    )
  ) {
    checks.interestBearingAssets = {
      status: "unavailable",
      message:
        "Interest-bearing assets cannot be evaluated because the required data is unavailable.",
    };
  } else if (
    data.interestBearingAssetsRatio < 30
  ) {
    checks.interestBearingAssets = {
      status: "pass",
      message:
        `Interest-bearing assets are ${data.interestBearingAssetsRatio}%, below the selected 30% threshold.`,
    };
  } else {
    checks.interestBearingAssets = {
      status: "fail",
      message:
        `Interest-bearing assets are ${data.interestBearingAssetsRatio}%, which reaches or exceeds the selected 30% threshold.`,
    };
  }

  if (
    data.impermissibleIncomeRatio ===
      undefined ||
    !Number.isFinite(
      data.impermissibleIncomeRatio
    )
  ) {
    checks.impermissibleIncome = {
      status: "unavailable",
      message:
        "Impermissible income cannot be evaluated because the required data is unavailable.",
    };
  } else if (
    data.impermissibleIncomeRatio < 5
  ) {
    checks.impermissibleIncome = {
      status: "pass",
      message:
        `Impermissible income is ${data.impermissibleIncomeRatio}%, below the selected 5% threshold.`,
    };
  } else {
    checks.impermissibleIncome = {
      status: "fail",
      message:
        `Impermissible income is ${data.impermissibleIncomeRatio}%, which reaches or exceeds the selected 5% threshold.`,
    };
  }

  let result: StockScreeningResult;

  if (
    checks.businessActivity.status ===
      "fail" ||
    checks.debtRatio.status === "fail" ||
    checks.interestBearingAssets.status ===
      "fail" ||
    checks.impermissibleIncome.status ===
      "fail"
  ) {
    result = "not_compliant";
  } else if (
    checks.businessActivity.status ===
    "review"
  ) {
    result = "needs_review";
  } else if (
    checks.debtRatio.status ===
      "unavailable" ||
    checks.interestBearingAssets.status ===
      "unavailable" ||
    checks.impermissibleIncome.status ===
      "unavailable"
  ) {
    result = "insufficient_data";
  } else {
    result = "compliant";
  }

  return {
    result,
    checks,
  };
}