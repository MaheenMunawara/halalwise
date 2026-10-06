const cik = "0000320193";

const url =
  `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

async function main() {
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

  const data = await response.json();

  console.log("Company:", data.entityName);
  console.log("CIK:", data.cik);

  const usGaap = data.facts?.["us-gaap"];

  if (!usGaap) {
    throw new Error("No US-GAAP facts found.");
  }

  console.log(
    "Total US-GAAP concepts:",
    Object.keys(usGaap).length
  );

  const importantConcepts = [
    "Assets",
    "Liabilities",
    "StockholdersEquity",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "InterestExpenseNonOperating",
    "InterestIncomeExpenseNonOperatingNet",
    "LongTermDebtNoncurrent",
    "LongTermDebtCurrent",
    "CashAndCashEquivalentsAtCarryingValue",
  ];

  console.log("\nAvailable requested concepts:");

  for (const concept of importantConcepts) {
    if (usGaap[concept]) {
      console.log(`✓ ${concept}`);
    } else {
      console.log(`✗ ${concept}`);
    }
  }
}

main().catch((error) => {
  console.error("SEC test failed:", error);
  process.exit(1);
});