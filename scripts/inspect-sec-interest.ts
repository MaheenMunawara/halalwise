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

  const usGaap = data.facts?.["us-gaap"];

  if (!usGaap) {
    throw new Error("No US-GAAP facts found.");
  }

  const concepts = Object.keys(usGaap)
    .filter((concept) => {
      const lower = concept.toLowerCase();

      return (
        lower.includes("interest") ||
        lower.includes("debt") ||
        lower.includes("securities") ||
        lower.includes("investment")
      );
    })
    .sort();

  console.log(
    `Found ${concepts.length} potentially relevant concepts:\n`
  );

  for (const concept of concepts) {
    console.log(concept);
  }
}

main().catch((error) => {
  console.error("SEC inspection failed:", error);
  process.exit(1);
});