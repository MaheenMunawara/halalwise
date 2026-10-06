type SecFinancialData = {
  assets: number | null;
  stockholdersEquity: number | null;

  longTermDebt: number | null;
  longTermDebtCurrent: number | null;
  longTermDebtNoncurrent: number | null;

  marketableSecuritiesCurrent: number | null;
  marketableSecuritiesNoncurrent: number | null;

  cash: number | null;

  interestExpense: number | null;
  investmentInterestAndDividendIncome: number | null;
};

type HalalWiseFinancialData = {
  marketCapitalization: number | null;
  interestBearingDebt: number | null;
  interestBearingAssets: number | null;
  totalIncome: number | null;
  impermissibleIncome: number | null;
};

type MappingStatus =
  | "available"
  | "requires_review"
  | "unavailable";

type MappingResult = {
  field: keyof HalalWiseFinancialData;
  value: number | null;
  status: MappingStatus;
  reason: string;
};

const secData: SecFinancialData = {
  assets: 383266000000,
  stockholdersEquity: 107520000000,

  longTermDebt: 82300000000,
  longTermDebtCurrent: 11007000000,
  longTermDebtNoncurrent: 71340000000,

  marketableSecuritiesCurrent: 22855000000,
  marketableSecuritiesNoncurrent: 84118000000,

  cash: 39544000000,

  interestExpense: null,
  investmentInterestAndDividendIncome: null,
};

function mapFinancialData(
  data: SecFinancialData
): {
  financialData: HalalWiseFinancialData;
  mapping: MappingResult[];
} {
  const mapping: MappingResult[] = [];

  /*
   * Market capitalization
   *
   * SEC Company Facts does not directly provide
   * current market capitalization.
   */
  mapping.push({
    field: "marketCapitalization",
    value: null,
    status: "unavailable",
    reason:
      "Market capitalization must come from a separate market-data source.",
  });

  /*
   * Interest-bearing debt
   *
   * LongTermDebt is clearly reported by SEC, but
   * we are not yet confirming that every component
   * should be treated as interest-bearing for the
   * HalalWise methodology.
   */
  mapping.push({
    field: "interestBearingDebt",
    value: null,
    status: "requires_review",
    reason:
      "SEC reports long-term debt, but HalalWise must confirm which debt components qualify as interest-bearing debt under its screening methodology.",
  });

  /*
   * Interest-bearing assets
   *
   * Marketable securities cannot automatically be
   * classified as interest-bearing assets.
   */
  mapping.push({
    field: "interestBearingAssets",
    value: null,
    status: "requires_review",
    reason:
      "Marketable securities are reported by SEC, but their Shariah classification cannot be inferred automatically from the XBRL concept name.",
  });

  /*
   * Total income
   *
   * We have not yet extracted the correct income
   * statement fact for the same reporting period.
   */
  mapping.push({
    field: "totalIncome",
    value: null,
    status: "unavailable",
    reason:
      "The correct income-statement value has not yet been extracted for the reporting period.",
  });

  /*
   * Impermissible income
   *
   * SEC accounting data does not directly identify
   * income as Shariah-impermissible.
   */
  mapping.push({
    field: "impermissibleIncome",
    value: null,
    status: "unavailable",
    reason:
      "Impermissible income cannot be inferred automatically from SEC accounting facts.",
  });

  return {
    financialData: {
      marketCapitalization: null,
      interestBearingDebt: null,
      interestBearingAssets: null,
      totalIncome: null,
      impermissibleIncome: null,
    },
    mapping,
  };
}

function main() {
  console.log(
    "================================"
  );
  console.log(
    "HALALWISE SEC FINANCIAL MAPPING"
  );
  console.log(
    "================================"
  );

  const result =
    mapFinancialData(secData);

  console.log("\nHalalWise financial data:");

  console.log(
    JSON.stringify(
      result.financialData,
      null,
      2
    )
  );

  console.log("\nMapping decisions:");

  for (const item of result.mapping) {
    console.log(
      `\n${item.field}`
    );

    console.log(
      `Status: ${item.status}`
    );

    console.log(
      `Value: ${item.value}`
    );

    console.log(
      `Reason: ${item.reason}`
    );
  }
}

main();