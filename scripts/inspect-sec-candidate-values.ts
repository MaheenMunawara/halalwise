import { secCompanies } from "./sec-companies.ts";

const candidateConcepts = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "Revenues",

  "LongTermDebt",
  "LongTermDebtCurrent",
  "LongTermDebtNoncurrent",
  "ShortTermBorrowings",

  "MarketableSecurities",
  "MarketableSecuritiesCurrent",
  "MarketableSecuritiesNoncurrent",

  "AvailableForSaleSecurities",
  "AvailableForSaleSecuritiesCurrent",

  "InvestmentIncomeInterest",
];

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

function getLatestFacts(fact: any) {
  if (!fact?.units) {
    return [];
  }

  const unitName = Object.keys(fact.units)[0];

  const values = fact.units[unitName];

  return values
    .filter((item: any) => item.form === "10-Q")
    .sort(
      (a: any, b: any) =>
        new Date(b.filed).getTime() -
        new Date(a.filed).getTime()
    )
    .slice(0, 3)
    .map((item: any) => ({
      value: item.val,
      start: item.start ?? null,
      end: item.end ?? null,
      filed: item.filed,
      form: item.form,
      frame: item.frame ?? null,
      unit: unitName,
    }));
}

async function main() {
  console.log(
    "================================"
  );

  console.log(
    "SEC CANDIDATE VALUE INSPECTION"
  );

  console.log(
    "================================"
  );

  for (const company of secCompanies) {
    console.log(
      `\n\n========== ${company.ticker} ==========`
    );

    try {
      const data =
        await fetchCompanyFacts(company.cik);

      const usGaap =
        data.facts?.["us-gaap"];

      if (!usGaap) {
        console.log(
          "No US-GAAP facts found."
        );
        continue;
      }

      for (const concept of candidateConcepts) {
        const fact = usGaap[concept];

        if (!fact) {
          console.log(
            `\n${concept}: NOT AVAILABLE`
          );
          continue;
        }

        console.log(
          `\n${concept} | ${fact.label ?? ""}`
        );

        const latest =
          getLatestFacts(fact);

        if (latest.length === 0) {
          console.log(
            "  No recent 10-Q values found."
          );
          continue;
        }

        for (const item of latest) {
          console.log(
            `  value=${item.value} | ` +
            `start=${item.start} | ` +
            `end=${item.end} | ` +
            `filed=${item.filed} | ` +
            `form=${item.form} | ` +
            `frame=${item.frame} | ` +
            `unit=${item.unit}`
          );
        }
      }
    } catch (error) {
      console.error(
        `Failed for ${company.ticker}:`,
        error
      );
    }
  }

  console.log(
    "\n================================"
  );

  console.log(
    "INSPECTION COMPLETE"
  );

  console.log(
    "================================"
  );
}

main().catch((error) => {
  console.error(
    "Inspection failed:",
    error
  );

  process.exit(1);
});