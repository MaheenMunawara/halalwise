export type FinancialDataInput = {
  marketCapitalization: unknown;
  interestBearingDebt: unknown;
  interestBearingAssets: unknown;
  totalIncome: unknown;
  impermissibleIncome: unknown;
  dataDate: unknown;
};

export type BusinessActivityInput = {
  mainBusinessActivity: unknown;
  businessClassification: unknown;
  prohibitedActivities: unknown;
};

export function validateFinancialData(
  data: FinancialDataInput,
  options?: {
    allowIncomplete?: boolean;
  }
) {
  const errors: string[] = [];

  const allowIncomplete =
    options?.allowIncomplete ?? false;

  const fields = [
    {
      name: "marketCapitalization",
      value: data.marketCapitalization,
    },
    {
      name: "interestBearingDebt",
      value: data.interestBearingDebt,
    },
    {
      name: "interestBearingAssets",
      value: data.interestBearingAssets,
    },
    {
      name: "totalIncome",
      value: data.totalIncome,
    },
    {
      name: "impermissibleIncome",
      value: data.impermissibleIncome,
    },
  ];

  for (const field of fields) {
    if (
      field.value === undefined ||
      field.value === null ||
      field.value === ""
    ) {
      if (!allowIncomplete) {
        errors.push(
          `${field.name} is required.`
        );
      }

      continue;
    }

    const number = Number(field.value);

    if (!Number.isFinite(number)) {
      errors.push(
        `${field.name} must be a valid number.`
      );
      continue;
    }

    if (number < 0) {
      errors.push(
        `${field.name} cannot be negative.`
      );
    }
  }

  const marketCap =
    Number(data.marketCapitalization);

  const totalIncome =
    Number(data.totalIncome);

  const debt =
    Number(data.interestBearingDebt);

  const interestBearingAssets =
    Number(data.interestBearingAssets);

  const impermissibleIncome =
    Number(data.impermissibleIncome);

  if (
    Number.isFinite(marketCap) &&
    marketCap <= 0
  ) {
    errors.push(
      "marketCapitalization must be greater than zero."
    );
  }

  if (
    Number.isFinite(totalIncome) &&
    totalIncome <= 0
  ) {
    errors.push(
      "totalIncome must be greater than zero."
    );
  }

  if (
    Number.isFinite(debt) &&
    Number.isFinite(marketCap) &&
    debt > marketCap
  ) {
    errors.push(
      "interestBearingDebt cannot exceed marketCapitalization."
    );
  }

  if (
    Number.isFinite(interestBearingAssets) &&
    Number.isFinite(marketCap) &&
    interestBearingAssets > marketCap
  ) {
    errors.push(
      "interestBearingAssets cannot exceed marketCapitalization."
    );
  }

  if (
    Number.isFinite(impermissibleIncome) &&
    Number.isFinite(totalIncome) &&
    impermissibleIncome > totalIncome
  ) {
    errors.push(
      "impermissibleIncome cannot exceed totalIncome."
    );
  }

  if (
    data.dataDate === undefined ||
    data.dataDate === null ||
    String(data.dataDate).trim() === ""
  ) {
    errors.push(
      "dataDate is required."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateBusinessActivity(
  data: BusinessActivityInput
) {
  const errors: string[] = [];

  const allowedClassifications = [
    "permissible",
    "prohibited",
    "mixed",
    "unclear",
  ];

  if (
    data.mainBusinessActivity ===
      undefined ||
    data.mainBusinessActivity === null ||
    String(data.mainBusinessActivity).trim() === ""
  ) {
    errors.push(
      "mainBusinessActivity is required."
    );
  }

  if (
    data.businessClassification ===
      undefined ||
    data.businessClassification === null ||
    String(data.businessClassification).trim() === ""
  ) {
    errors.push(
      "businessClassification is required."
    );
  } else if (
    !allowedClassifications.includes(
      String(data.businessClassification)
    )
  ) {
    errors.push(
      "businessClassification must be permissible, prohibited, mixed, or unclear."
    );
  }

  if (
    data.prohibitedActivities !==
      undefined &&
    !Array.isArray(
      data.prohibitedActivities
    )
  ) {
    errors.push(
      "prohibitedActivities must be an array."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function calculateFinancialRatios(data: {
  marketCapitalization: number | null;
  interestBearingDebt: number | null;
  interestBearingAssets: number | null;
  totalIncome: number | null;
  impermissibleIncome: number | null;
}) {
  const debtRatio =
    data.marketCapitalization != null &&
    data.interestBearingDebt != null &&
    data.marketCapitalization > 0
      ? Number(
          (
            (data.interestBearingDebt /
              data.marketCapitalization) *
            100
          ).toFixed(2)
        )
      : undefined;

  const interestBearingAssetsRatio =
    data.marketCapitalization != null &&
    data.interestBearingAssets != null &&
    data.marketCapitalization > 0
      ? Number(
          (
            (data.interestBearingAssets /
              data.marketCapitalization) *
            100
          ).toFixed(2)
        )
      : undefined;

  const impermissibleIncomeRatio =
    data.totalIncome != null &&
    data.impermissibleIncome != null &&
    data.totalIncome > 0
      ? Number(
          (
            (data.impermissibleIncome /
              data.totalIncome) *
            100
          ).toFixed(2)
        )
      : undefined;

  return {
    debtRatio,
    interestBearingAssetsRatio,
    impermissibleIncomeRatio,
  };
}