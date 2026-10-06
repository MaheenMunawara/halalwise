
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const cik = "0000320193";
const periodEnd = "2026-06-27";

const userAgent =
  process.env.SEC_USER_AGENT ||
  "HalalWise Finance Research contact@example.com";

const url =
  `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

const conceptsToCheck = [
  "ShortTermBorrowings",
  "ShortTermDebt",
  "CommercialPaper",
  "LongTermDebtCurrent",
  "LongTermDebtNoncurrent",
  "LongTermDebt",
  "LongTermDebtAndFinanceLeaseObligationsCurrent",
  "LongTermDebtAndFinanceLeaseObligationsNoncurrent",
];

async function main() {
  console.log("Fetching Apple SEC company facts...");

  const response = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `SEC request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  const facts = data.facts?.["us-gaap"];

  if (!facts) {
    throw new Error("US-GAAP facts were not found.");
  }

  console.log(`Company: ${data.entityName}`);
  console.log(`Period: ${periodEnd}`);

  for (const concept of conceptsToCheck) {
    const fact = facts[concept];

    console.log(`\n--- ${concept} ---`);

    if (!fact?.units) {
      console.log("Not found");
      continue;
    }

    let found = false;

    for (const [unit, values] of Object.entries(
      fact.units
    )) {
      const matches = values.filter(
        (item: any) => item.end === periodEnd
      );

      for (const item of matches) {
        found = true;

        console.log({
          label: fact.label,
          value: item.val,
          unit,
          start: item.start ?? null,
          end: item.end,
          filed: item.filed ?? null,
          form: item.form ?? null,
          frame: item.frame ?? null,
        });
      }
    }

    if (!found) {
      console.log(
        `No fact found for ${periodEnd}`
      );
    }
  }
}

main().catch((error) => {
  console.error("Inspection failed:", error);
  process.exit(1);
});