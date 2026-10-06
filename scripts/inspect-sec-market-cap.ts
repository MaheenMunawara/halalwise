const cik = "0000320193";

const url =
  `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

const concepts = [
  "Assets",
  "StockholdersEquity",
  "CommonStocksIncludingAdditionalPaidInCapital",
  "EntityCommonStockSharesOutstanding",
];

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
  const usGaap = data.facts?.["us-gaap"];

  if (!usGaap) {
    throw new Error("No US-GAAP facts found.");
  }

  for (const concept of concepts) {
    console.log("\n================================");
    console.log(concept);
    console.log("================================");

    const fact = usGaap[concept];

    if (!fact) {
      console.log("NOT AVAILABLE");
      continue;
    }

    console.log("Label:", fact.label);
    console.log("Description:", fact.description);

    for (const [unitName, values] of Object.entries(
      fact.units ?? {}
    )) {
      console.log(`\nUnit: ${unitName}`);

      const recentValues = (values as any[])
        .slice(-8);

      for (const item of recentValues) {
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
}

main().catch((error) => {
  console.error("SEC inspection failed:", error);
  process.exit(1);
});