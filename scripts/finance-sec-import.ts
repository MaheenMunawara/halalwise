import { secCompanies } from "./sec-companies.ts";

type FactValue = {
  val: number;
  start?: string;
  end?: string;
  filed: string;
  form: string;
  frame?: string;
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

async function fetchCompanyFacts(cik: string) {
  const url =
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "HalalWise/1.0 contact@halalwise.com",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `SEC request failed: ${response.status} ${response.statusText}`
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
  type: "instant" | "duration"
): Candidate | null {
  const candidates: Candidate[] = [];

  for (const concept of concepts) {
    const fact = usGaap[concept];

    if (!fact) continue;

    const values = get10QValues(fact);

    for (const value of values) {
      const isInstant =
        value.start == null && value.end != null;

      const isDuration =
        value.start != null && value.end != null;

      if (
        (type === "instant" && !isInstant) ||
        (type === "duration" && !isDuration)
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

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const endDifference =
      new Date(b.end!).getTime() -
      new Date(a.end!).getTime();

    if (endDifference !== 0) return endDifference;

    const filedDifference =
      new Date(b.filed).getTime() -
      new Date(a.filed).getTime();

    if (filedDifference !== 0) return filedDifference;

    if (type === "duration" && a.start && b.start) {
      return (
        new Date(a.start).getTime() -
        new Date(b.start).getTime()
      );
    }

    return concepts.indexOf(a.concept) -
      concepts.indexOf(b.concept);
  });

  return candidates[0];
}

async function collectCompany(company: {
  companyName: string;
  ticker: string;
  cik: string;
}) {
  const data = await fetchCompanyFacts(company.cik);
  const usGaap = data.facts?.["us-gaap"];

  if (!usGaap) {
    throw new Error("No US-GAAP facts found.");
  }

  const revenue = getLatestValueForConcepts(
    usGaap,
    [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
    ],
    "duration"
  );

  const assets = getLatestValueForConcepts(
    usGaap,
    ["Assets"],
    "instant"
  );

  const equity = getLatestValueForConcepts(
    usGaap,
    ["StockholdersEquity"],
    "instant"
  );

  const cash = getLatestValueForConcepts(
    usGaap,
    ["CashAndCashEquivalentsAtCarryingValue"],
    "instant"
  );

  const netIncome = getLatestValueForConcepts(
    usGaap,
    ["NetIncomeLoss"],
    "duration"
  );

  const longTermDebt = getLatestValueForConcepts(
    usGaap,
    ["LongTermDebt"],
    "instant"
  );

  const longTermDebtCurrent = getLatestValueForConcepts(
    usGaap,
    ["LongTermDebtCurrent"],
    "instant"
  );

  const longTermDebtNoncurrent =
    getLatestValueForConcepts(
      usGaap,
      ["LongTermDebtNoncurrent"],
      "instant"
    );

  const shortTermBorrowings =
    getLatestValueForConcepts(
      usGaap,
      ["ShortTermBorrowings"],
      "instant"
    );

  const marketableSecuritiesCurrent =
    getLatestValueForConcepts(
      usGaap,
      ["MarketableSecuritiesCurrent"],
      "instant"
    );

  const marketableSecuritiesNoncurrent =
    getLatestValueForConcepts(
      usGaap,
      ["MarketableSecuritiesNoncurrent"],
      "instant"
    );

  const investmentIncomeInterest =
    getLatestValueForConcepts(
      usGaap,
      [
        "InvestmentIncomeInterest",
        "InterestIncomeOther",
      ],
      "duration"
    );

  return {
    companyName: company.companyName,
    ticker: company.ticker,
    cik: company.cik,

    reportingDate:
      revenue?.end ??
      assets?.end ??
      null,

    financialData: {
      totalIncome: revenue?.value ?? null,

      assets: assets?.value ?? null,

      stockholdersEquity:
        equity?.value ?? null,

      cash: cash?.value ?? null,

      netIncome: netIncome?.value ?? null,

      longTermDebt:
        longTermDebt?.value ?? null,

      longTermDebtCurrent:
        longTermDebtCurrent?.value ?? null,

      longTermDebtNoncurrent:
        longTermDebtNoncurrent?.value ?? null,

      shortTermBorrowings:
        shortTermBorrowings?.value ?? null,

      marketableSecuritiesCurrent:
        marketableSecuritiesCurrent?.value ?? null,

      marketableSecuritiesNoncurrent:
        marketableSecuritiesNoncurrent?.value ?? null,

      /*
       * These remain null intentionally.
       *
       * SEC facts alone do not establish
       * the Shariah-specific classification.
       */
      interestBearingDebt: null,
      interestBearingAssets: null,
      impermissibleIncome: null,
      marketCapitalization: null,
    },

    researchData: {
      revenueConcept:
        revenue?.concept ?? null,

      revenueStart:
        revenue?.start ?? null,

      revenueEnd:
        revenue?.end ?? null,

      revenueFiled:
        revenue?.filed ?? null,

      investmentIncomeInterest:
        investmentIncomeInterest?.value ?? null,

      investmentIncomeInterestConcept:
        investmentIncomeInterest?.concept ?? null,
    },

    source: {
      name: "SEC EDGAR Company Facts API",
      url:
        "https://data.sec.gov/api/xbrl/companyfacts/",
      filingForm: "10-Q",
      dataDate:
        revenue?.end ??
        assets?.end ??
        null,
    },
  };
}

async function main() {
  console.log("================================");
  console.log("HALALWISE SEC FINANCE DATA BRIDGE");
  console.log("================================");

  const results = [];

  for (const company of secCompanies) {
    console.log(
      `\nProcessing ${company.companyName} (${company.ticker})...`
    );

    try {
      const result = await collectCompany(company);

      results.push(result);

      console.log(
        `✓ ${company.ticker} mapped successfully`
      );

      console.log(
        `  Reporting date: ${
          result.reportingDate ?? "not found"
        }`
      );

      console.log(
        `  Total income: ${
          result.financialData.totalIncome ?? "not found"
        }`
      );

      console.log(
        `  Interest-bearing debt: ${
          result.financialData.interestBearingDebt
        }`
      );

      console.log(
        `  Interest-bearing assets: ${
          result.financialData.interestBearingAssets
        }`
      );

      console.log(
        `  Impermissible income: ${
          result.financialData.impermissibleIncome
        }`
      );
    } catch (error) {
      console.error(
        `✗ ${company.ticker} failed:`,
        error
      );
    }
  }

  console.log("\n================================");
  console.log("BRIDGE SUMMARY");
  console.log("================================");

  console.log(
    `Companies requested: ${secCompanies.length}`
  );

  console.log(
    `Companies mapped: ${results.length}`
  );

  console.log("\n================================");
  console.log("MAPPED DATA");
  console.log("================================");

  console.log(
    JSON.stringify(results, null, 2)
  );
}

main().catch((error) => {
  console.error(
    "SEC finance bridge failed:",
    error
  );

  process.exit(1);
});