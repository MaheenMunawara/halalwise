import { secCompanies } from "./sec-companies.ts";

const keywordGroups = {
  revenue: [
    "revenue",
    "sales",
    "income"
  ],

  debt: [
    "debt",
    "borrow",
    "notespayable",
    "longterm"
  ],

  securities: [
    "securities",
    "marketable",
    "investment"
  ],
};

async function fetchCompanyFacts(
  cik: string
) {
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

function findConcepts(
  concepts: string[],
  keywords: string[]
) {
  return concepts
    .filter((concept) => {
      const lower =
        concept.toLowerCase();

      return keywords.some(
        (keyword) =>
          lower.includes(keyword)
      );
    })
    .sort();
}

async function main() {
  console.log(
    "================================"
  );

  console.log(
    "SEC CONCEPT DIAGNOSTIC"
  );

  console.log(
    "================================"
  );

  for (
    const company of secCompanies
  ) {
    console.log(
      `\n\n========== ${company.ticker} ==========`
    );

    try {
      const data =
        await fetchCompanyFacts(
          company.cik
        );

      const usGaap =
        data.facts?.["us-gaap"];

      if (!usGaap) {
        console.log(
          "No US-GAAP facts found."
        );

        continue;
      }

      const concepts =
        Object.keys(usGaap);

      for (
        const [groupName, keywords]
        of Object.entries(
          keywordGroups
        )
      ) {
        const matches =
          findConcepts(
            concepts,
            keywords
          );

        console.log(
          `\n--- ${groupName.toUpperCase()} ---`
        );

        console.log(
          `Found ${matches.length} concepts`
        );

        for (
          const concept of matches
        ) {
          const fact =
            usGaap[concept];

          console.log(
            `${concept} | ${fact.label ?? ""}`
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
}

main().catch((error) => {
  console.error(
    "Diagnostic failed:",
    error
  );

  process.exit(1);
});