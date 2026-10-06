
import { secCompanies } from "./sec-companies.ts";
import { financeSecMappings } from "./finance-sec-mapping.ts";

type FactValue = {
  val: number;
  start?: string;
  end?: string;
  filed: string;
  form: string;
  frame?: string;
  unit?: string;
};

type Candidate = {
  concept: string;
  value: number;
  start: string | null;
  end: string | null;
  filed: string;
  form: string;
  frame: string | null;
  unit: string | null;
};

type FieldPeriod = {
  concept: string;
  start: string | null;
  end: string | null;
  filed: string;
  form: string;
  unit: string | null;
} | null;

async function fetchCompanyFacts(cik: string) {
  const url = "https://data.sec.gov/api/xbrl/companyfacts/CIK" + cik + ".json";

  const response = await fetch(url, {
    headers: {
      "User-Agent": "HalalWise/1.0 contact@halalwise.com",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      "SEC request failed: " +
        response.status +
        " " +
        response.statusText
    );
  }

  return response.json();
}

function getUnits(fact: any) {
  if (!fact?.units) return [];

  const units = fact.units;

  const unitName =
    units.USD ? "USD" : Object.keys(units)[0];

  if (!unitName) return [];

  return units[unitName].map((item: FactValue) => ({
    ...item,
    unit: unitName,
  }));
}

function get10QValues(fact: any) {
  return getUnits(fact).filter(
    (item: any) =>
      item.form === "10-Q" &&
      item.end &&
      Number.isFinite(item.val)
  );
}

function getLatestValueForConcepts(
  usGaap: any,
  concepts: string[],
  type: "instant" | "duration",
  targetEndDate?: string | null
): Candidate | null {
  const candidates: Candidate[] = [];

  for (const concept of concepts) {
    const fact = usGaap[concept];

    if (!fact) continue;

    const values = get10QValues(fact);

    for (const value of values) {
      const isInstant =
        value.start == null &&
        value.end != null;

      const isDuration =
        value.start != null &&
        value.end != null;

      if (
        (type === "instant" && !isInstant) ||
        (type === "duration" && !isDuration)
      ) {
        continue;
      }

      // For balance-sheet values, only accept
      // the requested reporting date.
      if (
        type === "instant" &&
        targetEndDate &&
        value.end !== targetEndDate
      ) {
        continue;
      }

      candidates.push({
        concept,
        value: value.val,
        start: value.start ?? null,
        end: value.end ?? null,
        filed: value.filed,
        form: value.form,
        frame: value.frame ?? null,
        unit: value.unit ?? null,
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    const endDifference =
      new Date(b.end!).getTime() -
      new Date(a.end!).getTime();

    if (endDifference !== 0) {
      return endDifference;
    }

    const filedDifference =
      new Date(b.filed).getTime() -
      new Date(a.filed).getTime();

    if (filedDifference !== 0) {
      return filedDifference;
    }

    // For duration values with the same end date,
    // prefer the longer reporting period.
    if (
      type === "duration" &&
      a.start &&
      b.start
    ) {
      const startDifference =
        new Date(a.start).getTime() -
        new Date(b.start).getTime();

      if (startDifference !== 0) {
        return startDifference;
      }
    }

    return (
      concepts.indexOf(a.concept) -
      concepts.indexOf(b.concept)
    );
  });

  return candidates[0];
}

function toFieldPeriod(
  candidate: Candidate | null
): FieldPeriod {
  if (!candidate) {
    return null;
  }

  return {
    concept: candidate.concept,
    start: candidate.start,
    end: candidate.end,
    filed: candidate.filed,
    form: candidate.form,
    unit: candidate.unit,
  };
}

function getMapping(field: string) {
  return financeSecMappings.find(
    (mapping) => mapping.field === field
  );
}

async function collectCompany(company: {
  companyName: string;
  ticker: string;
  cik: string;
}) {
  const data =
    await fetchCompanyFacts(company.cik);

  const usGaap =
    data.facts?.["us-gaap"];

  if (!usGaap) {
    throw new Error(
      "No US-GAAP facts found."
    );
  }

  // ----------------------------------------
  // REVENUE
  // ----------------------------------------

  const incomeMapping =
    getMapping("totalIncome");

  const incomeResult =
    getLatestValueForConcepts(
      usGaap,
      incomeMapping?.concepts ?? [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
      ],
      "duration"
    );

  // The revenue period end becomes the
  // primary reporting date for this collection.
  const reportingDate =
    incomeResult?.end ?? null;

  // ----------------------------------------
  // BALANCE SHEET
  // ----------------------------------------

  // Only accept instant values that match
  // the company's current reporting date.
  //
  // This prevents old SEC values such as
  // old debt or securities from being silently used.

  const assets =
    getLatestValueForConcepts(
      usGaap,
      ["Assets"],
      "instant",
      reportingDate
    );

  const stockholdersEquity =
    getLatestValueForConcepts(
      usGaap,
      ["StockholdersEquity"],
      "instant",
      reportingDate
    );

  const cash =
    getLatestValueForConcepts(
      usGaap,
      ["CashAndCashEquivalentsAtCarryingValue"],
      "instant",
      reportingDate
    );

  // ----------------------------------------
  // NET INCOME
  // ----------------------------------------

  const netIncome =
    getLatestValueForConcepts(
      usGaap,
      ["NetIncomeLoss"],
      "duration"
    );

  // ----------------------------------------
  // DEBT CANDIDATES
  // ----------------------------------------

  const debtMapping =
    getMapping("interestBearingDebt");

  const longTermDebt =
    getLatestValueForConcepts(
      usGaap,
      ["LongTermDebt"],
      "instant",
      reportingDate
    );

  const longTermDebtCurrent =
    getLatestValueForConcepts(
      usGaap,
      ["LongTermDebtCurrent"],
      "instant",
      reportingDate
    );

  const longTermDebtNoncurrent =
    getLatestValueForConcepts(
      usGaap,
      ["LongTermDebtNoncurrent"],
      "instant",
      reportingDate
    );

  const shortTermBorrowings =
    getLatestValueForConcepts(
      usGaap,
      ["ShortTermBorrowings"],
      "instant",
      reportingDate
    );

  // ----------------------------------------
  // SECURITIES CANDIDATES
  // ----------------------------------------

  const assetMapping =
    getMapping("interestBearingAssets");

  const marketableSecurities =
    getLatestValueForConcepts(
      usGaap,
      ["MarketableSecurities"],
      "instant",
      reportingDate
    );

  const marketableSecuritiesCurrent =
    getLatestValueForConcepts(
      usGaap,
      ["MarketableSecuritiesCurrent"],
      "instant",
      reportingDate
    );

  const marketableSecuritiesNoncurrent =
    getLatestValueForConcepts(
      usGaap,
      ["MarketableSecuritiesNoncurrent"],
      "instant",
      reportingDate
    );

  // ----------------------------------------
  // INTEREST INCOME RESEARCH
  // ----------------------------------------

  // This is NOT automatically classified
  // as impermissible income.

  const impermissibleMapping =
    getMapping("impermissibleIncome");

  const investmentIncomeInterest =
    getLatestValueForConcepts(
      usGaap,
      [
        "InvestmentIncomeInterest",
        "InterestIncomeOther",
      ],
      "duration"
    );

  // ----------------------------------------
  // DEBT MAPPING
  // ----------------------------------------

  /*
   * Conservative debt mapping:
   *
   * 1. Prefer a clearly reported LongTermDebt total.
   * 2. Otherwise, if both current and non-current
   *    components exist, combine them.
   * 3. Otherwise, use short-term borrowings when
   *    available.
   *
   * We never add LongTermDebt together with its
   * current/non-current components because that
   * could double-count the same debt.
   */

  let interestBearingDebt: number | null = null;

  if (longTermDebt?.value != null) {
    interestBearingDebt =
      longTermDebt.value;
  } else if (
    longTermDebtCurrent?.value != null &&
    longTermDebtNoncurrent?.value != null
  ) {
    interestBearingDebt =
      longTermDebtCurrent.value +
      longTermDebtNoncurrent.value;
  } else if (
    shortTermBorrowings?.value != null
  ) {
    interestBearingDebt =
      shortTermBorrowings.value;
  }

  // ----------------------------------------
  // FIELD PERIODS
  // ----------------------------------------

  const fieldPeriods = {
    assets:
      toFieldPeriod(assets),

    stockholdersEquity:
      toFieldPeriod(stockholdersEquity),

    cash:
      toFieldPeriod(cash),

    totalIncome:
      toFieldPeriod(incomeResult),

    netIncome:
      toFieldPeriod(netIncome),

    longTermDebt:
      toFieldPeriod(longTermDebt),

    longTermDebtCurrent:
      toFieldPeriod(longTermDebtCurrent),

    longTermDebtNoncurrent:
      toFieldPeriod(longTermDebtNoncurrent),

    shortTermBorrowings:
      toFieldPeriod(shortTermBorrowings),

    marketableSecurities:
      toFieldPeriod(marketableSecurities),

    marketableSecuritiesCurrent:
      toFieldPeriod(marketableSecuritiesCurrent),

    marketableSecuritiesNoncurrent:
      toFieldPeriod(marketableSecuritiesNoncurrent),

    investmentIncomeInterest:
      toFieldPeriod(investmentIncomeInterest),
  };

  // ----------------------------------------
  // RESULT
  // ----------------------------------------

  return {
    companyName:
      company.companyName,

    ticker:
      company.ticker,

    cik:
      company.cik,

    reportingDate,

    financialData: {
      assets:
        assets?.value ?? null,

      stockholdersEquity:
        stockholdersEquity?.value ?? null,

      longTermDebt:
        longTermDebt?.value ?? null,

      longTermDebtCurrent:
        longTermDebtCurrent?.value ?? null,

      longTermDebtNoncurrent:
        longTermDebtNoncurrent?.value ?? null,

      shortTermBorrowings:
        shortTermBorrowings?.value ?? null,

      marketableSecurities:
        marketableSecurities?.value ?? null,

      marketableSecuritiesCurrent:
        marketableSecuritiesCurrent?.value ?? null,

      marketableSecuritiesNoncurrent:
        marketableSecuritiesNoncurrent?.value ?? null,

      cash:
        cash?.value ?? null,

      totalIncome:
        incomeResult?.value ?? null,

      netIncome:
        netIncome?.value ?? null,

      interestBearingDebt,

      // These remain intentionally null.
      // They require methodology/review before
      // HalalWise can calculate them.
      interestBearingAssets:
        null,

      impermissibleIncome:
        null,
    },

    fieldPeriods,

    researchData: {
      revenueConcept:
        incomeResult?.concept ?? null,

      revenueStart:
        incomeResult?.start ?? null,

      revenueEnd:
        incomeResult?.end ?? null,

      revenueFiled:
        incomeResult?.filed ?? null,

      assetsEnd:
        assets?.end ?? null,

      equityEnd:
        stockholdersEquity?.end ?? null,

      cashEnd:
        cash?.end ?? null,

      netIncomeStart:
        netIncome?.start ?? null,

      netIncomeEnd:
        netIncome?.end ?? null,

      investmentIncomeInterest:
        investmentIncomeInterest?.value ?? null,

      investmentIncomeInterestConcept:
        investmentIncomeInterest?.concept ?? null,

      investmentIncomeInterestStart:
        investmentIncomeInterest?.start ?? null,

      investmentIncomeInterestEnd:
        investmentIncomeInterest?.end ?? null,
    },

    source: {
      name:
        "SEC EDGAR Company Facts API",

      url:
        "https://data.sec.gov/api/xbrl/companyfacts/",

      filingForm:
        "10-Q",

      dataDate:
        reportingDate,
    },

    mappingStatus: {
      marketCapitalization:
        "requires_market_data",

      interestBearingDebt:
        debtMapping?.status ??
        "requires_review",

      interestBearingAssets:
        assetMapping?.status ??
        "requires_review",

      impermissibleIncome:
        impermissibleMapping?.status ??
        "requires_shariah_review",
    },
  };
}

async function main() {
  console.log(
    "================================"
  );

  console.log(
    "HALALWISE US SEC COLLECTION"
  );

  console.log(
    "================================"
  );

  const collected: any[] = [];

  for (const company of secCompanies) {
    console.log(
      `\nFetching ${company.companyName} (${company.ticker})...`
    );

    try {
      const result =
        await collectCompany(company);

      collected.push(result);

      console.log(
        `✓ ${company.ticker} collected successfully`
      );

      console.log(
        `  Reporting date: ${
          result.reportingDate ?? "not found"
        }`
      );

      console.log(
        `  Revenue period: ${
          result.researchData.revenueStart ??
          "?"
        } → ${
          result.researchData.revenueEnd ??
          "?"
        }`
      );

      console.log(
        `  Interest-bearing debt: ${
          result.financialData.interestBearingDebt ??
          "not available"
        }`
      );
    } catch (error) {
      console.error(
        `✗ ${company.ticker} failed:`,
        error
      );
    }
  }

  console.log(
    "\n================================"
  );

  console.log(
    "COLLECTION SUMMARY"
  );

  console.log(
    "================================"
  );

  console.log(
    `Companies requested: ${secCompanies.length}`
  );

  console.log(
    `Companies collected: ${collected.length}`
  );

  console.log(
    "\n================================"
  );

  console.log(
    "COLLECTED DATA"
  );

  console.log(
    "================================"
  );

  console.log(
    JSON.stringify(
      collected,
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    "Collection failed:",
    error
  );

  process.exit(1);
});
