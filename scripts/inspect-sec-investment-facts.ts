const cik = "0000320193";

const url =
  `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

const keywords = [
  "cash",
  "marketable",
  "securities",
  "investment",
  "interestincome",
  "interestexpense",
  "debt",
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

  const concepts = Object.keys(usGaap)
    .filter((concept) => {
      const lower = concept.toLowerCase();

      return keywords.some((keyword) =>
        lower.includes(keyword)
      );
    })
    .sort();

  console.log(
    `Found ${concepts.length} potentially relevant concepts.\n`
  );

  for (const concept of concepts) {
    const fact = usGaap[concept];

    console.log("\n================================");
    console.log(concept);
    console.log("================================");

    console.log("Label:", fact.label);
    console.log("Description:", fact.description);

    for (const [unitName, values] of Object.entries(
      fact.units ?? {}
    )) {
      const items = (values as any[]).filter(
        (item) =>
          item.end === "2026-06-27" &&
          item.form === "10-Q"
      );

      if (items.length === 0) {
        continue;
      }

      console.log(`\nUnit: ${unitName}`);

      for (const item of items.slice(-3)) {
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
  console.error(
    "SEC investment inspection failed:",
    error
  );

  process.exit(1);
});