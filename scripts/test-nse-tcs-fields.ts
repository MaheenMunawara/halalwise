const url =
  "https://nsearchives.nseindia.com/corporate/ixbrl/INTEGRATED_FILING_INDAS_173420_09072026183620_iXBRL_WEB.html";

async function main() {
  console.log(
    "Extracting financial fields from TCS NSE filing...\n"
  );

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml",
      Referer: "https://www.nseindia.com/",
    },
  });

  if (!response.ok) {
    throw new Error(
      `NSE request failed: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

  const keywords = [
    "Revenue",
    "Revenue from operations",
    "Total Income",
    "Total income",
    "Profit for the period",
    "Profit after tax",
    "Finance costs",
    "Interest",
    "Borrowings",
    "Debt",
    "Cash and cash equivalents",
    "Bank balances",
    "Investments",
    "Other financial assets",
    "Marketable securities",
    "Income from investments",
    "Interest income",
  ];

  console.log(
    "========== MATCHING FINANCIAL FIELDS ==========\n"
  );

  for (const keyword of keywords) {
    const index = text
      .toLowerCase()
      .indexOf(keyword.toLowerCase());

    if (index === -1) {
      console.log(`NOT FOUND: ${keyword}`);
      continue;
    }

    const start = Math.max(0, index - 250);
    const end = Math.min(
      text.length,
      index + keyword.length + 500
    );

    console.log(`\nFOUND: ${keyword}`);
    console.log(
      text.slice(start, end)
    );
    console.log(
      "\n----------------------------------------"
    );
  }

  console.log(
    "\n========== EXTRACTION COMPLETE ==========\n"
  );
}

main().catch((error) => {
  console.error(
    "NSE field extraction failed:",
    error
  );

  process.exit(1);
});