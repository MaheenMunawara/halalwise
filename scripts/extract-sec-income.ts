const cik = "0000320193";

const url =
  `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

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

async function main() {
  console.log(
    "Fetching SEC income data for Apple..."
  );

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

  const usGaap =
    data.facts?.["us-gaap"];

  if (!usGaap) {
    throw new Error(
      "No US-GAAP facts found."
    );
  }

  const concepts = [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "SalesRevenueNet",
    "Revenues",
    "ProfitLoss",
    "NetIncomeLoss",
    "InterestExpense",
    "InvestmentIncomeInterestAndDividend",
  ];

  console.log(
    "\n================================"
  );

  console.log(
    "AVAILABLE INCOME FACTS"
  );

  console.log(
    "================================"
  );

  for (const concept of concepts) {
    console.log(
      `\n${concept}`
    );

    const fact =
      usGaap[concept];

    if (!fact) {
      console.log(
        "NOT AVAILABLE"
      );

      continue;
    }

    console.log(
      `Label: ${fact.label}`
    );

    const values =
      fact.units?.USD ?? [];

    const recentValues =
      values
        .filter(
          (item: SecFact) =>
            item.form === "10-Q"
        )
        .slice(-10);

    for (
      const item of recentValues
    ) {
      console.log({
        fy: item.fy,
        fp: item.fp,
        form: item.form,
        filed: item.filed,
        start: item.start,
        end: item.end,
        val: item.val,
        frame: item.frame,
      });
    }
  }
}

main().catch((error) => {
  console.error(
    "\nSEC income extraction failed:",
    error
  );

  process.exit(1);
});