import { secCompanies } from "./sec-companies.ts";

type SecFact = {
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
  start?: string;
  end?: string;
  val: number;
  frame?: string;
};

type SecFacts = Record<
  string,
  {
    label?: string;
    description?: string;
    units?: Record<string, SecFact[]>;
  }
>;

function getLatestBalanceSheetFact(
  fact: SecFacts[string] | undefined,
  endDate: string
): SecFact | null {
  if (!fact?.units) {
    return null;
  }

  const values = fact.units.USD ?? [];

  const matches = values.filter(
    (item) =>
      item.form === "10-Q" &&
      item.end === endDate &&
      item.start === undefined
  );

  if (matches.length === 0) {
    return null;
  }

  return matches[matches.length - 1];
}

function getLatestFlowFact(
  fact: SecFacts[string] | undefined,
  endDate: string
): SecFact | null {
  if (!fact?.units) {
    return null;
  }

  const values = fact.units.USD ?? [];

  const matches = values.filter(
    (item) =>
      item.form === "10-Q" &&
      item.end === endDate &&
      item.start !== undefined
  );

  if (matches.length === 0) {
    return null;
  }

  return matches[matches.length - 1];
}

async function fetchCompanyFacts(cik: string) {
  const url =
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "HalalWise/1.0 contact@halalwise.com",
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

async function main() {
  const company = secCompanies[0];

  console.log(
    `Fetching SEC data for ${company.companyName} (${company.ticker})...`
  );

  const data = await fetchCompanyFacts(
    company.cik
  );

  const usGaap = data.facts?.["us-gaap"] as SecFacts;

  if (!usGaap) {
    throw new Error(
      "No US-GAAP facts found."
    );
  }

  const balanceSheetDates = new Set<string>();

  const balanceSheetConcepts = [
    "Assets",
    "StockholdersEquity",
    "LongTermDebt",
    "LongTermDebtCurrent",
    "LongTermDebtNoncurrent",
    "MarketableSecuritiesCurrent",
    "MarketableSecuritiesNoncurrent",
    "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
  ];

  for (const concept of balanceSheetConcepts) {
    const fact = usGaap[concept];

    const values =
      fact?.units?.USD ?? [];

    for (const item of values) {
      if (
        item.form === "10-Q" &&
        item.start === undefined &&
        item.end
      ) {
        balanceSheetDates.add(item.end);
      }
    }
  }

  const dates = Array.from(
    balanceSheetDates
  ).sort();

  const latestDate =
    dates[dates.length - 1];

  if (!latestDate) {
    throw new Error(
      "Could not determine latest balance-sheet date."
    );
  }

  console.log(
    `\nLatest balance-sheet date: ${latestDate}`
  );

  const longTermDebt =
    getLatestBalanceSheetFact(
      usGaap.LongTermDebt,
      latestDate
    );

  const currentDebt =
    getLatestBalanceSheetFact(
      usGaap.LongTermDebtCurrent,
      latestDate
    );

  const nonCurrentDebt =
    getLatestBalanceSheetFact(
      usGaap.LongTermDebtNoncurrent,
      latestDate
    );

  const assets =
    getLatestBalanceSheetFact(
      usGaap.Assets,
      latestDate
    );

  const equity =
    getLatestBalanceSheetFact(
      usGaap.StockholdersEquity,
      latestDate
    );

  const marketableSecuritiesCurrent =
    getLatestBalanceSheetFact(
      usGaap.MarketableSecuritiesCurrent,
      latestDate
    );

  const marketableSecuritiesNoncurrent =
    getLatestBalanceSheetFact(
      usGaap.MarketableSecuritiesNoncurrent,
      latestDate
    );

  const cash =
    getLatestBalanceSheetFact(
      usGaap
        .CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents,
      latestDate
    );

  const interestExpense =
    getLatestFlowFact(
      usGaap.InterestExpense,
      latestDate
    );

  const investmentIncome =
    getLatestFlowFact(
      usGaap.InvestmentIncomeInterestAndDividend,
      latestDate
    );

  const result = {
    companyName: company.companyName,
    ticker: company.ticker,
    cik: company.cik,

    reportingDate: latestDate,

    financialData: {
      assets: assets?.val ?? null,
      stockholdersEquity:
        equity?.val ?? null,

      longTermDebt:
        longTermDebt?.val ?? null,

      longTermDebtCurrent:
        currentDebt?.val ?? null,

      longTermDebtNoncurrent:
        nonCurrentDebt?.val ?? null,

      marketableSecuritiesCurrent:
        marketableSecuritiesCurrent?.val ??
        null,

      marketableSecuritiesNoncurrent:
        marketableSecuritiesNoncurrent?.val ??
        null,

      cash:
        cash?.val ?? null,

      interestExpense:
        interestExpense?.val ?? null,

      investmentInterestAndDividendIncome:
        investmentIncome?.val ?? null,
    },

    sources: {
      sourceName: "SEC EDGAR Company Facts API",
      sourceUrl: "https://data.sec.gov/api/xbrl/companyfacts/",
      filingForm: "10-Q",
      dataDate: latestDate,
    },
  };

  console.log(
    "\n================================"
  );
  console.log("EXTRACTED SEC DATA");
  console.log(
    "================================"
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    "\nSEC extraction failed:",
    error
  );

  process.exit(1);
});